# Action Provider Quick Start

## Minimal Example

```typescript
import { ActionProvider, WalletProvider, Network, CreateAction } from "@coinbase/agentkit";
import { z } from "zod";

// 1. Define schema
const MySchema = z.object({
  message: z.string().describe("A message"),
}).strict();

// 2. Create provider class
class MyActionProvider extends ActionProvider<WalletProvider> {
  constructor() {
    super("my-provider", []);
  }

  // 3. Add action (without wallet)
  @CreateAction({
    name: "my-action",
    description: "Does something",
    schema: MySchema,
  })
  async myAction(args: z.infer<typeof MySchema>): Promise<string> {
    return `Result: ${args.message}`;
  }

  // 4. Add action (with wallet)
  @CreateAction({
    name: "wallet-action",
    description: "Uses wallet",
    schema: z.object({}).strict(),
  })
  async walletAction(
    walletProvider: WalletProvider,
    args: Record<string, never>
  ): Promise<string> {
    return walletProvider.getAddress();
  }

  // 5. Define network support
  supportsNetwork = (network: Network) => true;
}

// 6. Export factory
export const myActionProvider = () => new MyActionProvider();
```

## Basic Test

```typescript
import { myActionProvider } from "./myActionProvider";
import { WalletProvider, Network } from "@coinbase/agentkit";

describe("MyActionProvider", () => {
  let provider: ReturnType<typeof myActionProvider>;
  let mockWallet: jest.Mocked<WalletProvider>;

  beforeEach(() => {
    provider = myActionProvider();
    mockWallet = {
      getAddress: jest.fn().mockReturnValue("0x123..."),
      getNetwork: jest.fn().mockReturnValue({
        protocolFamily: "evm",
        networkId: "base-sepolia",
        chainId: "84532",
      } as Network),
    } as any;
  });

  it("should execute action", async () => {
    const result = await provider.myAction({ message: "test" });
    expect(result).toContain("test");
  });

  it("should return actions", () => {
    const actions = provider.getActions(mockWallet);
    expect(actions.length).toBeGreaterThan(0);
  });
});
```

## Key Points

1. **Extend `ActionProvider<WalletProvider>`** - Use `WalletProvider` if you need wallet access
2. **Call `super(name, [])`** - Name your provider, empty array for no sub-providers
3. **Use `@CreateAction` decorator** - Mark methods as actions
4. **Return `Promise<string>`** - All actions return a string
5. **Wallet as first param** - If using wallet, make it the first parameter
6. **Implement `supportsNetwork`** - Define which networks are supported
7. **Export factory function** - Create instances with `myActionProvider()`

## Requirements

- `tsconfig.json` must have:
  ```json
  {
    "compilerOptions": {
      "experimentalDecorators": true,
      "emitDecoratorMetadata": true
    }
  }
  ```
- Import `reflect-metadata` in your entry point (usually done automatically)

## See Also

- Full guide: `CREATING_ACTION_PROVIDER_GUIDE.md`
- Example implementation: `examples/myActionProvider.ts`
- Example tests: `examples/myActionProvider.test.ts`

