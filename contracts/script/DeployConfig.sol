// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

library DeployConfig {

    address constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant BASE_SEPOLIA_DELEGATION_MANAGER = 0x2a80B79a5eeBD95E700B1D2Dab1bC7EEAc9A2e3a;
    address constant BASE_SEPOLIA_DELEGATOR_IMPL = 0x63c0c19a282a1B52b07dD5a65b58948A07DAEf9a;
    address constant BASE_MAINNET_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address constant BASE_MAINNET_DELEGATION_MANAGER = 0x0000000000000000000000000000000000000000;
    address constant BASE_MAINNET_DELEGATOR_IMPL = 0x0000000000000000000000000000000000000000;

    function usdc(uint256 chainId) internal pure returns (address) {
        if (chainId == 8453) return BASE_MAINNET_USDC;
        if (chainId == 84532) return BASE_SEPOLIA_USDC;
        revert("DeployConfig: unsupported chain");
    }

    function delegationManager(uint256 chainId) internal pure returns (address) {
        if (chainId == 8453) return BASE_MAINNET_DELEGATION_MANAGER;
        if (chainId == 84532) return BASE_SEPOLIA_DELEGATION_MANAGER;
        revert("DeployConfig: unsupported chain");
    }
}
