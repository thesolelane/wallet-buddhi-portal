import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("wallet-buddhi", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.WalletBuddhi as Program;
  const user = provider.wallet;

  it("Initializes a user account", async () => {
    const [userAccountPDA, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), user.publicKey.toBuffer()],
      program.programId
    );

    const tx = await program.methods
      .initializeUser()
      .accounts({
        userAccount: userAccountPDA,
        user: user.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Initialize user transaction signature:", tx);

    const account = await program.account.userAccount.fetch(userAccountPDA);
    
    assert.equal(account.owner.toString(), user.publicKey.toString());
    assert.equal(account.tier.basic !== undefined, true);
    assert.equal(account.bump, bump);
  });

  it("Upgrades user tier from Basic to Pro", async () => {
    const [userAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), user.publicKey.toBuffer()],
      program.programId
    );

    const paymentSignature = "mock_payment_signature_12345";

    const tx = await program.methods
      .upgradeTier({ pro: {} }, paymentSignature)
      .accounts({
        userAccount: userAccountPDA,
        user: user.publicKey,
        owner: user.publicKey,
      })
      .rpc();

    console.log("Upgrade tier transaction signature:", tx);

    const account = await program.account.userAccount.fetch(userAccountPDA);
    
    assert.equal(account.tier.pro !== undefined, true);
    assert.equal(account.lastPaymentSignature, paymentSignature);
  });

  it("Upgrades user tier from Pro to ProPlus", async () => {
    const [userAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), user.publicKey.toBuffer()],
      program.programId
    );

    const paymentSignature = "mock_payment_signature_67890";

    const tx = await program.methods
      .upgradeTier({ proPlus: {} }, paymentSignature)
      .accounts({
        userAccount: userAccountPDA,
        user: user.publicKey,
        owner: user.publicKey,
      })
      .rpc();

    console.log("Upgrade to ProPlus transaction signature:", tx);

    const account = await program.account.userAccount.fetch(userAccountPDA);
    
    assert.equal(account.tier.proPlus !== undefined, true);
    assert.equal(account.lastPaymentSignature, paymentSignature);
  });

  it("Fails to downgrade tier", async () => {
    const [userAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), user.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .upgradeTier({ basic: {} }, "downgrade_attempt")
        .accounts({
          userAccount: userAccountPDA,
          user: user.publicKey,
          owner: user.publicKey,
        })
        .rpc();
      
      assert.fail("Should have thrown an error for tier downgrade");
    } catch (error) {
      assert.include(
        error.toString(),
        "InvalidTierUpgrade",
        "Expected InvalidTierUpgrade error"
      );
    }
  });

  it("Fetches user tier correctly", async () => {
    const [userAccountPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), user.publicKey.toBuffer()],
      program.programId
    );

    const tier = await program.methods
      .getUserTier()
      .accounts({
        userAccount: userAccountPDA,
        user: user.publicKey,
      })
      .view();

    console.log("User tier:", tier);
    assert.equal(tier.proPlus !== undefined, true);
  });
});
