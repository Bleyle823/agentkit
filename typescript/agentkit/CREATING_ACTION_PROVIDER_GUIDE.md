# Creating and Testing Action Providers

This guide will walk you through creating a custom action provider and testing it.

## Overview

Action providers define the actions that an agent can take. They extend the `ActionProvider` abstract class and use decorators to mark methods as actions.

## Step 1: Create the Action Provider Class

First, create a class that extends `ActionProvider`:

```typescript
import { ActionProvider, WalletProvider, Network } from "@coinbase/agentkit";

class MyActionProvider extends ActionProvider<WalletProvider> {
  constructor() {
    super("my-action-provider", []);
  }

  // Define if the action provider supports the given network
  supportsNetwork = (network: Network) => true;
}
```

**Key Points:**
- The constructor takes a name (string) and an array of sub-providers (empty array `[]` for a simple provider)
- You must implement `supportsNetwork` to indicate which networks your provider supports
- The generic type `<WalletProvider>` indicates this provider can use wallet functionality

## Step 2: Define Action Schemas

Actions use Zod schemas to validate inputs. Create a schemas file:

```typescript
// schemas.ts
import { z } from "zod";

export const MyActionSchema = z.object({
  message: z.string().min(1).max(100).describe("A message to process"),
  amount: z.string().regex(/^\d+(\.\d+)?$/).describe("An amount as a decimal string"),
  optionalField: z.string().optional().describe("An optional field"),
}).strict();
```

**Key Points:**
- Use `.strict()` to prevent extra fields
- Use `.describe()` to help the AI understand each field
- Use appropriate validators (`.min()`, `.max()`, `.regex()`, etc.)

## Step 3: Add Actions to Your Provider

Actions are methods decorated with `@CreateAction`. There are two types:

### Action Without Wallet Provider

```typescript
import { ActionProvider, CreateAction } from "@coinbase/agentkit";
import { z } from "zod";
import { MyActionSchema } from "./schemas";

class MyActionProvider extends ActionProvider<WalletProvider> {
  constructor() {
    super("my-action-provider", []);
  }

  @CreateAction({
    name: "my-action",
    description: "Performs a simple action without wallet access",
    schema: MyActionSchema,
  })
  async myAction(args: z.infer<typeof MyActionSchema>): Promise<string> {
    // Your action logic here
    return `Processed: ${args.message} with amount ${args.amount}`;
  }

  supportsNetwork = (network: Network) => true;
}
```

### Action With Wallet Provider

If your action needs wallet functionality, make the wallet provider the first parameter:

```typescript
import { ActionProvider, CreateAction, WalletProvider } from "@coinbase/agentkit";
import { z } from "zod";
import { MyActionSchema } from "./schemas";

class MyActionProvider extends ActionProvider<WalletProvider> {
  constructor() {
    super("my-action-provider", []);
  }

  @CreateAction({
    name: "my-wallet-action",
    description: "Performs an action that uses wallet functionality",
    schema: MyActionSchema,
  })
  async myWalletAction(
    walletProvider: WalletProvider,
    args: z.infer<typeof MyActionSchema>
  ): Promise<string> {
    const address = walletProvider.getAddress();
    const network = walletProvider.getNetwork();
    
    // Your action logic here
    return `Action performed by ${address} on ${network.networkId}`;
  }

  supportsNetwork = (network: Network) => true;
}
```

**Key Points:**
- Actions must return `Promise<string>`
- If using a wallet provider, it must be the first parameter
- The decorator automatically detects if you're using a wallet provider based on the first parameter type

## Step 4: Export the Provider

Create a factory function to instantiate your provider:

```typescript
export const myActionProvider = () => new MyActionProvider();
```

## Step 5: TypeScript Configuration

Ensure your `tsconfig.json` has decorator support enabled:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Step 6: Testing Your Action Provider

Create a test file using Jest:

```typescript
// myActionProvider.test.ts
import { myActionProvider } from "./myActionProvider";
import { WalletProvider, Network } from "@coinbase/agentkit";

describe("MyActionProvider", () => {
  let provider: ReturnType<typeof myActionProvider>;
  let mockWalletProvider: jest.Mocked<WalletProvider>;

  beforeEach(() => {
    // Create a fresh provider instance
    provider = myActionProvider();

    // Create a mock wallet provider
    mockWalletProvider = {
      getAddress: jest.fn().mockReturnValue("0x1234567890123456789012345678901234567890"),
      getNetwork: jest.fn().mockReturnValue({
        protocolFamily: "evm",
        networkId: "base-sepolia",
        chainId: "84532",
      } as Network),
      getName: jest.fn().mockReturnValue("mock-wallet"),
    } as any;
  });

  describe("initialization", () => {
    it("should initialize with correct provider name", () => {
      expect(provider.name).toBe("my-action-provider");
    });

    it("should support all networks", () => {
      const mockNetwork = {
        protocolFamily: "evm",
        networkId: "base-sepolia",
      } as Network;
      expect(provider.supportsNetwork(mockNetwork)).toBe(true);
    });
  });

  describe("myAction", () => {
    it("should execute action without wallet provider", async () => {
      const args = {
        message: "test message",
        amount: "1.5",
      };

      const result = await provider.myAction(args);
      
      expect(result).toContain("test message");
      expect(result).toContain("1.5");
    });

    it("should validate schema and reject invalid input", async () => {
      const invalidArgs = {
        message: "", // Empty string should fail min(1) validation
        amount: "1.5",
      };

      await expect(provider.myAction(invalidArgs as any)).rejects.toThrow();
    });
  });

  describe("myWalletAction", () => {
    it("should execute action with wallet provider", async () => {
      const args = {
        message: "test",
        amount: "1.0",
      };

      const result = await provider.myWalletAction(mockWalletProvider, args);
      
      expect(result).toContain(mockWalletProvider.getAddress());
      expect(mockWalletProvider.getAddress).toHaveBeenCalled();
      expect(mockWalletProvider.getNetwork).toHaveBeenCalled();
    });
  });

  describe("getActions", () => {
    it("should return all actions", () => {
      const actions = provider.getActions(mockWalletProvider);
      
      expect(actions.length).toBeGreaterThan(0);
      expect(actions.find(a => a.name.includes("my-action"))).toBeDefined();
      expect(actions.find(a => a.name.includes("my-wallet-action"))).toBeDefined();
    });

    it("should return actions with correct schemas", () => {
      const actions = provider.getActions(mockWalletProvider);
      const myAction = actions.find(a => a.name.includes("my-action"));
      
      expect(myAction).toBeDefined();
      expect(myAction?.description).toBeDefined();
      expect(myAction?.schema).toBeDefined();
    });
  });
});
```

## Step 7: Using Your Action Provider

Add your action provider to an AgentKit instance:

```typescript
import { AgentKit } from "@coinbase/agentkit";
import { myActionProvider } from "./myActionProvider";

const agentKit = await AgentKit.from({
  cdpApiKeyId: "CDP API KEY NAME",
  cdpApiKeySecret: "CDP API KEY SECRET",
  actionProviders: [
    myActionProvider(),
  ],
});
```

## Complete Example

Here's a complete example combining all the concepts:

```typescript
// myActionProvider.ts
import { ActionProvider, WalletProvider, Network, CreateAction } from "@coinbase/agentkit";
import { z } from "zod";

// Define schema
const GreetingSchema = z.object({
  name: z.string().min(1).describe("The name to greet"),
  times: z.number().int().min(1).max(10).describe("Number of times to repeat"),
}).strict();

class MyActionProvider extends ActionProvider<WalletProvider> {
  constructor() {
    super("my-action-provider", []);
  }

  @CreateAction({
    name: "greet",
    description: "Greets a person by name a specified number of times",
    schema: GreetingSchema,
  })
  async greet(args: z.infer<typeof GreetingSchema>): Promise<string> {
    const greetings = Array(args.times).fill(`Hello, ${args.name}!`);
    return greetings.join(" ");
  }

  @CreateAction({
    name: "get_wallet_info",
    description: "Gets information about the current wallet",
    schema: z.object({}).strict(),
  })
  async getWalletInfo(
    walletProvider: WalletProvider,
    args: Record<string, never>
  ): Promise<string> {
    const address = walletProvider.getAddress();
    const network = walletProvider.getNetwork();
    return `Wallet: ${address} on ${network.networkId}`;
  }

  supportsNetwork = (network: Network) => true;
}

export const myActionProvider = () => new MyActionProvider();
```

## Testing Tips

1. **Mock External Dependencies**: Use Jest mocks for API calls, wallet operations, etc.
2. **Test Schema Validation**: Test both valid and invalid inputs
3. **Test Error Cases**: Ensure your actions handle errors gracefully
4. **Test Network Support**: Verify `supportsNetwork` works correctly
5. **Test Action Retrieval**: Use `getActions()` to verify actions are properly registered

## Running Tests

```bash
# Run all tests
npm test

# Run tests for a specific file
npm test -- myActionProvider.test.ts

# Run tests in watch mode
npm test -- --watch
```

## Common Issues

1. **Decorators not working**: Ensure `experimentalDecorators` and `emitDecoratorMetadata` are enabled in `tsconfig.json`
2. **Metadata not found**: Make sure `reflect-metadata` is imported (usually in your entry point)
3. **Wallet provider type errors**: Ensure the first parameter type matches `WalletProvider` or a subclass

## Next Steps

- Add more actions to your provider
- Implement network-specific logic in `supportsNetwork`
- Add integration tests with real wallet providers
- Document your actions clearly for AI agents

