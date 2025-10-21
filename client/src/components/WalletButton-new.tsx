import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export function WalletButton() {
  return (
    <WalletMultiButton
      data-testid="button-wallet-connect"
      className="!bg-primary !text-primary-foreground hover-elevate active-elevate-2 !rounded-md !h-9 !px-4 !py-2 !text-sm !font-medium"
    />
  );
}
