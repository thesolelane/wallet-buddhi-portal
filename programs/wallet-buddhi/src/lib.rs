use anchor_lang::prelude::*;

declare_id!("EcorGtD2gpLK9FRGHCJwSd1PPRhVo2yDWYkpEvPfoogQ");

#[program]
pub mod wallet_buddhi {
    use super::*;

    pub fn initialize_user(ctx: Context<InitializeUser>) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        user_account.owner = ctx.accounts.user.key();
        user_account.tier = Tier::Basic;
        user_account.created_at = Clock::get()?.unix_timestamp;
        user_account.updated_at = Clock::get()?.unix_timestamp;
        user_account.bump = ctx.bumps.user_account;
        
        msg!("User account initialized for: {}", user_account.owner);
        Ok(())
    }

    pub fn upgrade_tier(
        ctx: Context<UpgradeTier>,
        new_tier: Tier,
        payment_signature: String,
    ) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        
        require!(
            new_tier as u8 > user_account.tier as u8,
            ErrorCode::InvalidTierUpgrade
        );
        
        user_account.tier = new_tier;
        user_account.updated_at = Clock::get()?.unix_timestamp;
        user_account.last_payment_signature = Some(payment_signature);
        
        msg!(
            "User {} upgraded to tier: {:?}",
            user_account.owner,
            new_tier
        );
        Ok(())
    }

    pub fn get_user_tier(ctx: Context<GetUserTier>) -> Result<Tier> {
        Ok(ctx.accounts.user_account.tier)
    }
}

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + UserAccount::INIT_SPACE,
        seeds = [b"user", user.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpgradeTier<'info> {
    #[account(
        mut,
        seeds = [b"user", user.key().as_ref()],
        bump = user_account.bump,
        has_one = owner
    )]
    pub user_account: Account<'info, UserAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// CHECK: This is the owner field from user_account
    pub owner: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct GetUserTier<'info> {
    #[account(
        seeds = [b"user", user.key().as_ref()],
        bump = user_account.bump
    )]
    pub user_account: Account<'info, UserAccount>,
    
    pub user: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct UserAccount {
    pub owner: Pubkey,
    pub tier: Tier,
    pub created_at: i64,
    pub updated_at: i64,
    #[max_len(88)]
    pub last_payment_signature: Option<String>,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum Tier {
    Basic,
    Pro,
    ProPlus,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid tier upgrade: new tier must be higher than current tier")]
    InvalidTierUpgrade,
}
