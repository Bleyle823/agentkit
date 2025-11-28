import { myActionProvider } from "./myActionProvider";
import { WalletProvider, Network } from "@coinbase/agentkit";

describe("MyActionProvider", () => {
  let provider: ReturnType<typeof myActionProvider>;
  let mockWalletProvider: jest.Mocked<WalletProvider>;

  beforeEach(() => {
    // Create a fresh provider instance for each test
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
      getBalance: jest.fn().mockResolvedValue(BigInt("1000000000000000000")), // 1 ETH
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
        chainId: "84532",
      } as Network;
      
      expect(provider.supportsNetwork(mockNetwork)).toBe(true);
    });

    it("should support Solana networks", () => {
      const solanaNetwork = {
        protocolFamily: "svm",
        networkId: "solana-devnet",
      } as Network;
      
      expect(provider.supportsNetwork(solanaNetwork)).toBe(true);
    });
  });

  describe("greet action", () => {
    it("should greet a person the specified number of times", async () => {
      const args = {
        name: "Alice",
        times: 3,
      };

      const result = await provider.greet(args);
      
      expect(result).toBe("Hello, Alice! Hello, Alice! Hello, Alice!");
      expect(result.split("Hello, Alice!").length - 1).toBe(3);
    });

    it("should handle single greeting", async () => {
      const args = {
        name: "Bob",
        times: 1,
      };

      const result = await provider.greet(args);
      
      expect(result).toBe("Hello, Bob!");
    });

    it("should validate schema and reject empty name", async () => {
      const invalidArgs = {
        name: "", // Empty string should fail min(1) validation
        times: 1,
      };

      await expect(provider.greet(invalidArgs as any)).rejects.toThrow();
    });

    it("should validate schema and reject invalid times", async () => {
      const invalidArgs = {
        name: "Test",
        times: 0, // Should fail min(1) validation
      };

      await expect(provider.greet(invalidArgs as any)).rejects.toThrow();
    });

    it("should validate schema and reject times > 10", async () => {
      const invalidArgs = {
        name: "Test",
        times: 11, // Should fail max(10) validation
      };

      await expect(provider.greet(invalidArgs as any)).rejects.toThrow();
    });
  });

  describe("getWalletInfo action", () => {
    it("should return wallet information", async () => {
      const args = {};

      const result = await provider.getWalletInfo(mockWalletProvider, args);
      const parsed = JSON.parse(result);
      
      expect(parsed.address).toBe(mockWalletProvider.getAddress());
      expect(parsed.network).toBe("base-sepolia");
      expect(parsed.chainId).toBe("84532");
      expect(parsed.protocolFamily).toBe("evm");
      expect(parsed.balance).toBe("1000000000000000000");
      
      // Verify wallet provider methods were called
      expect(mockWalletProvider.getAddress).toHaveBeenCalled();
      expect(mockWalletProvider.getNetwork).toHaveBeenCalled();
      expect(mockWalletProvider.getBalance).toHaveBeenCalled();
    });
  });

  describe("getActions", () => {
    it("should return all registered actions", () => {
      const actions = provider.getActions(mockWalletProvider);
      
      expect(actions.length).toBe(2);
      
      const greetAction = actions.find(a => a.name.includes("greet"));
      const walletInfoAction = actions.find(a => a.name.includes("get_wallet_info"));
      
      expect(greetAction).toBeDefined();
      expect(walletInfoAction).toBeDefined();
    });

    it("should return actions with correct metadata", () => {
      const actions = provider.getActions(mockWalletProvider);
      const greetAction = actions.find(a => a.name.includes("greet"));
      
      expect(greetAction?.description).toContain("Greets a person");
      expect(greetAction?.schema).toBeDefined();
      expect(greetAction?.invoke).toBeDefined();
    });

    it("should allow invoking actions through the Action interface", async () => {
      const actions = provider.getActions(mockWalletProvider);
      const greetAction = actions.find(a => a.name.includes("greet"));
      
      if (!greetAction) {
        throw new Error("greet action not found");
      }

      const result = await greetAction.invoke({
        name: "Test",
        times: 2,
      });
      
      expect(result).toBe("Hello, Test! Hello, Test!");
    });

    it("should allow invoking wallet actions through the Action interface", async () => {
      const actions = provider.getActions(mockWalletProvider);
      const walletInfoAction = actions.find(a => a.name.includes("get_wallet_info"));
      
      if (!walletInfoAction) {
        throw new Error("get_wallet_info action not found");
      }

      const result = await walletInfoAction.invoke({});
      const parsed = JSON.parse(result);
      
      expect(parsed.address).toBeDefined();
      expect(parsed.network).toBeDefined();
    });
  });
});

