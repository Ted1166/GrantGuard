// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import { Script, console2 } from "forge-std/Script.sol";
import { GrantVault } from "../src/GrantVault.sol";
import { MilestoneRegistry } from "../src/MilestoneRegistry.sol";
import { MilestoneCapEnforcer } from "../src/MilestoneCapEnforcer.sol";

contract Deploy is Script {

    address constant USDC_BASE_SEPOLIA  = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant USDC_BASE_MAINNET  = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_KEY");
        address committee = vm.envAddress("COMMITTEE_ADDRESS");
        address reviewerAgent = vm.envAddress("REVIEWER_AGENT");
        address distributorAgent = vm.envAddress("DISTRIBUTOR_AGENT");

        address usdc = block.chainid == 8453
            ? USDC_BASE_MAINNET
            : USDC_BASE_SEPOLIA;

        console2.log("=== GrantGuard Deployment ===");
        console2.log("Chain ID: ", block.chainid);
        console2.log("Committee: ", committee);
        console2.log("USDC: ", usdc);
        console2.log("Reviewer Agent: ", reviewerAgent);
        console2.log("Distributor Agent: ", distributorAgent);

        vm.startBroadcast(deployerKey);

        GrantVault vault = new GrantVault(usdc, committee);
        console2.log("GrantVault: ", address(vault));

        MilestoneRegistry registry = new MilestoneRegistry(address(vault), committee);
        console2.log("MilestoneRegistry: ", address(registry));

        MilestoneCapEnforcer enforcer = new MilestoneCapEnforcer();
        console2.log("MilestoneCapEnforcer: ", address(enforcer));

        vault.setMilestoneRegistry(address(registry));
        console2.log("Vault registry set:     OK");

        registry.setReviewerAgent(reviewerAgent);
        registry.setDistributorAgent(distributorAgent);
        console2.log("Registry agents set: OK");

        vm.stopBroadcast();

        console2.log("\n=== Deployment Complete ===");
        console2.log("Copy these into your .env:");
        console2.log("NEXT_PUBLIC_GRANT_VAULT= ", address(vault));
        console2.log("NEXT_PUBLIC_MILESTONE_REGISTRY=", address(registry));
        console2.log("NEXT_PUBLIC_CAP_ENFORCER= ", address(enforcer));
    }
}
