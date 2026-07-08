//! Bountly Solana Escrow Program
//! USDC escrow with 3% platform fee on payout + Rally crowdfunded bounties

use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("Bount1111111111111111111111111111111111111");

#[program]
pub mod bounty_escrow {
    use super::*;

    pub fn initialize_fee_vault(ctx: Context<InitializeFeeVault>) -> Result<()> {
        ctx.accounts.fee_vault.authority = ctx.accounts.authority.key();
        ctx.accounts.fee_vault.bump = ctx.bumps.fee_vault;
        Ok(())
    }

    pub fn create_bounty(
        ctx: Context<CreateBounty>,
        bounty_id: String,
        reward: u64,
        deadline: i64,
    ) -> Result<()> {
        require!(reward > 0, BountyError::InvalidReward);
        require!(deadline > Clock::get()?.unix_timestamp, BountyError::InvalidDeadline);
        require!(bounty_id.len() <= 64, BountyError::BountyIdTooLong);

        let escrow = &mut ctx.accounts.escrow;
        escrow.creator = ctx.accounts.creator.key();
        escrow.hunter = Pubkey::default();
        escrow.reward = reward;
        escrow.funded_amount = reward;
        escrow.is_rally = false;
        escrow.deadline = deadline;
        escrow.bounty_id = bounty_id;
        escrow.status = BountyStatus::Open;
        escrow.bump = ctx.bumps.escrow;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.creator_usdc.to_account_info(),
                    to: ctx.accounts.escrow_usdc.to_account_info(),
                    authority: ctx.accounts.creator.to_account_info(),
                },
            ),
            reward,
        )?;

        Ok(())
    }

    pub fn create_rally(
        ctx: Context<CreateBounty>,
        bounty_id: String,
        target_reward: u64,
        creator_seed: u64,
        deadline: i64,
    ) -> Result<()> {
        require!(target_reward > 0, BountyError::InvalidReward);
        require!(creator_seed > 0 && creator_seed <= target_reward, BountyError::InvalidSeed);
        require!(deadline > Clock::get()?.unix_timestamp, BountyError::InvalidDeadline);
        require!(bounty_id.len() <= 64, BountyError::BountyIdTooLong);

        let escrow = &mut ctx.accounts.escrow;
        escrow.creator = ctx.accounts.creator.key();
        escrow.hunter = Pubkey::default();
        escrow.reward = target_reward;
        escrow.funded_amount = creator_seed;
        escrow.is_rally = true;
        escrow.deadline = deadline;
        escrow.bounty_id = bounty_id;
        escrow.status = BountyStatus::Open;
        escrow.bump = ctx.bumps.escrow;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.creator_usdc.to_account_info(),
                    to: ctx.accounts.escrow_usdc.to_account_info(),
                    authority: ctx.accounts.creator.to_account_info(),
                },
            ),
            creator_seed,
        )?;

        Ok(())
    }

    pub fn contribute_to_rally(ctx: Context<ContributeToRally>, amount: u64) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(escrow.is_rally, BountyError::NotRally);
        require!(escrow.status == BountyStatus::Open, BountyError::InvalidStatus);
        require!(amount > 0, BountyError::InvalidReward);
        require!(escrow.funded_amount < escrow.reward, BountyError::FullyFunded);

        let remaining = escrow.reward - escrow.funded_amount;
        let deposit = amount.min(remaining);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.backer_usdc.to_account_info(),
                    to: ctx.accounts.escrow_usdc.to_account_info(),
                    authority: ctx.accounts.backer.to_account_info(),
                },
            ),
            deposit,
        )?;

        escrow.funded_amount += deposit;
        Ok(())
    }

    pub fn submit(ctx: Context<Submit>, hunter: Pubkey) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(escrow.status == BountyStatus::Open, BountyError::InvalidStatus);
        escrow.hunter = hunter;
        escrow.status = BountyStatus::Submitted;
        Ok(())
    }

    pub fn approve_and_pay(ctx: Context<ApproveAndPay>, hunter: Pubkey) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(
            escrow.status == BountyStatus::Open || escrow.status == BountyStatus::Submitted,
            BountyError::InvalidStatus
        );
        if escrow.is_rally {
            require!(escrow.funded_amount >= escrow.reward, BountyError::Underfunded);
        }

        let fee = escrow.reward * 300 / 10000;
        let payout = escrow.reward - fee;

        let seeds = &[b"escrow", escrow.bounty_id.as_bytes(), &[escrow.bump]];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_usdc.to_account_info(),
                    to: ctx.accounts.hunter_usdc.to_account_info(),
                    authority: ctx.accounts.escrow.to_account_info(),
                },
                signer,
            ),
            payout,
        )?;

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_usdc.to_account_info(),
                    to: ctx.accounts.fee_vault_usdc.to_account_info(),
                    authority: ctx.accounts.escrow.to_account_info(),
                },
                signer,
            ),
            fee,
        )?;

        escrow.hunter = hunter;
        escrow.status = BountyStatus::Paid;
        Ok(())
    }

    pub fn mark_disputed(ctx: Context<MarkDisputed>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(
            escrow.status == BountyStatus::Submitted,
            BountyError::InvalidStatus
        );
        escrow.status = BountyStatus::Disputed;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeFeeVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + FeeVault::INIT_SPACE,
        seeds = [b"fee_vault"],
        bump
    )]
    pub fee_vault: Account<'info, FeeVault>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(bounty_id: String)]
pub struct CreateBounty<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = 8 + BountyEscrow::INIT_SPACE,
        seeds = [b"escrow", bounty_id.as_bytes()],
        bump
    )]
    pub escrow: Account<'info, BountyEscrow>,

    #[account(
        init,
        payer = creator,
        associated_token::mint = usdc_mint,
        associated_token::authority = escrow,
    )]
    pub escrow_usdc: Account<'info, TokenAccount>,

    #[account(mut, associated_token::mint = usdc_mint, associated_token::authority = creator)]
    pub creator_usdc: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ContributeToRally<'info> {
    #[account(mut)]
    pub backer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"escrow", escrow.bounty_id.as_bytes()],
        bump = escrow.bump,
        constraint = escrow.is_rally @ BountyError::NotRally
    )]
    pub escrow: Account<'info, BountyEscrow>,

    #[account(mut, associated_token::mint = usdc_mint, associated_token::authority = escrow)]
    pub escrow_usdc: Account<'info, TokenAccount>,

    #[account(mut, associated_token::mint = usdc_mint, associated_token::authority = backer)]
    pub backer_usdc: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Submit<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        has_one = creator,
        seeds = [b"escrow", escrow.bounty_id.as_bytes()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, BountyEscrow>,
}

#[derive(Accounts)]
pub struct MarkDisputed<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        has_one = creator,
        seeds = [b"escrow", escrow.bounty_id.as_bytes()],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, BountyEscrow>,
}

#[derive(Accounts)]
pub struct ApproveAndPay<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(mut, has_one = creator, seeds = [b"escrow", escrow.bounty_id.as_bytes()], bump = escrow.bump)]
    pub escrow: Account<'info, BountyEscrow>,

    #[account(mut, associated_token::mint = usdc_mint, associated_token::authority = escrow)]
    pub escrow_usdc: Account<'info, TokenAccount>,

    /// CHECK: hunter pubkey validated in instruction
    pub hunter: UncheckedAccount<'info>,

    #[account(mut, associated_token::mint = usdc_mint, associated_token::authority = hunter)]
    pub hunter_usdc: Account<'info, TokenAccount>,

    #[account(mut, associated_token::mint = usdc_mint, associated_token::authority = fee_vault)]
    pub fee_vault_usdc: Account<'info, TokenAccount>,

    #[account(seeds = [b"fee_vault"], bump = fee_vault.bump)]
    pub fee_vault: Account<'info, FeeVault>,

    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

#[account]
#[derive(InitSpace)]
pub struct FeeVault {
    pub authority: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct BountyEscrow {
    pub creator: Pubkey,
    pub hunter: Pubkey,
    pub reward: u64,
    pub funded_amount: u64,
    pub is_rally: bool,
    pub deadline: i64,
    #[max_len(64)]
    pub bounty_id: String,
    pub status: BountyStatus,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum BountyStatus {
    Open,
    Submitted,
    Approved,
    Paid,
    Expired,
    Disputed,
    Refunded,
}

#[error_code]
pub enum BountyError {
    #[msg("Invalid bounty status")]
    InvalidStatus,
    #[msg("Invalid reward amount")]
    InvalidReward,
    #[msg("Invalid deadline")]
    InvalidDeadline,
    #[msg("Bounty ID too long")]
    BountyIdTooLong,
    #[msg("Not a rally bounty")]
    NotRally,
    #[msg("Rally already fully funded")]
    FullyFunded,
    #[msg("Rally underfunded")]
    Underfunded,
    #[msg("Invalid creator seed")]
    InvalidSeed,
}
