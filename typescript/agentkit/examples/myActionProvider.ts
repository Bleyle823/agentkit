import { ActionProvider, WalletProvider, Network, CreateAction } from "@coinbase/agentkit";
import { z } from "zod";

/**
 * Schema for the greet action
 */
const GreetingSchema = z.object({
  name: z.string().min(1).max(50).describe("The name of the person to greet"),
  times: z.number().int().min(1).max(10).describe("Number of times to repeat the greeting"),
}).strict();

/**
 * Schema for the wallet info action
 */
const WalletInfoSchema = z.object({}).strict();

/**
 * MyActionProvider demonstrates how to create a custom action provider
 * with actions that both use and don't use wallet providers.
 */
export class MyActionProvider extends ActionProvider<WalletProvider> {
  constructor() {
    super("my-action-provider", []);
  }

  /**
   * A simple action that doesn't require wallet access
   */
  @CreateAction({
    name: "greet",
    description: "Greets a person by name a specified number of times. Useful for testing action providers.",
    schema: GreetingSchema,
  })
  async greet(args: z.infer<typeof GreetingSchema>): Promise<string> {
    const greetings = Array(args.times)
      .fill(null)
      .map(() => `Hello, ${args.name}!`);
    return greetings.join(" ");
  }

  /**
   * An action that uses wallet provider to get wallet information
   */
  @CreateAction({
    name: "get_wallet_info",
    description: "Gets information about the current wallet including address and network",
    schema: WalletInfoSchema,
  })
  async getWalletInfo(
    walletProvider: WalletProvider,
    args: z.infer<typeof WalletInfoSchema>
  ): Promise<string> {
    const address = walletProvider.getAddress();
    const network = walletProvider.getNetwork();
    const balance = await walletProvider.getBalance();
    
    return JSON.stringify({
      address,
      network: network.networkId,
      chainId: network.chainId,
      protocolFamily: network.protocolFamily,
      balance: balance.toString(),
    }, null, 2);
  }

  /**
   * Define network support - this provider works on all networks
   */
  supportsNetwork = (network: Network) => true;
}

/**
 * Factory function to create a new instance of MyActionProvider
 */
export const myActionProvider = () => new MyActionProvider();

