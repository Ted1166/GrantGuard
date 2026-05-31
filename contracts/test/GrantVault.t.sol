// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import { Test, console2 } from "forge-std/Test.sol";
import { GrantVault } from "../src/GrantVault.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";

contract GrantVaultTest is Test {

    GrantVault vault;
    MockERC20 usdc;

    address committee = makeAddr("committee");
    address registry = makeAddr("registry");
    address builder = makeAddr("builder");
    address funder = makeAddr("funder");
    address attacker = makeAddr("attacker");

    bytes32 GRANT_A = keccak256("grant-alpha");
    bytes32 GRANT_B = keccak256("grant-beta");
    bytes32 MILESTONE_1 = keccak256("milestone-1");

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        vault = new GrantVault(address(usdc), committee);

        vm.prank(committee);
        vault.setMilestoneRegistry(registry);

        usdc.mint(funder, 100_000e6);
        vm.prank(funder);
        usdc.approve(address(vault), type(uint256).max);
    }

    function test_constructor_setsOwner() public view {
        assertEq(vault.owner(), committee);
    }

    function test_constructor_setsUSDC() public view {
        assertEq(address(vault.usdc()), address(usdc));
    }

    function test_constructor_revertsZeroUSDC() public {
        vm.expectRevert(GrantVault.ZeroAddress.selector);
        new GrantVault(address(0), committee);
    }

    function test_setRegistry_revertsIfAlreadySet() public {
        vm.prank(committee);
        vm.expectRevert(GrantVault.RegistryAlreadySet.selector);
        vault.setMilestoneRegistry(makeAddr("new-registry"));
    }

    function test_setRegistry_revertsIfNotOwner() public {
        GrantVault freshVault = new GrantVault(address(usdc), committee);
        vm.prank(attacker);
        vm.expectRevert();
        freshVault.setMilestoneRegistry(registry);
    }

    function test_fundGrant_increasesAllocation() public {
        vm.prank(funder);
        vault.fundGrant(GRANT_A, 1000e6);

        assertEq(vault.grantAllocation(GRANT_A), 1000e6);
        assertEq(vault.totalAllocated(), 1000e6);
    }

    function test_fundGrant_emitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit GrantVault.GrantFunded(GRANT_A, funder, 1000e6);

        vm.prank(funder);
        vault.fundGrant(GRANT_A, 1000e6);
    }

    function test_fundGrant_revertsZeroAmount() public {
        vm.prank(funder);
        vm.expectRevert(GrantVault.ZeroAmount.selector);
        vault.fundGrant(GRANT_A, 0);
    }

    function test_fundGrant_multipleGrantsTrackedSeparately() public {
        vm.startPrank(funder);
        vault.fundGrant(GRANT_A, 500e6);
        vault.fundGrant(GRANT_B, 300e6);
        vm.stopPrank();

        assertEq(vault.grantAllocation(GRANT_A), 500e6);
        assertEq(vault.grantAllocation(GRANT_B), 300e6);
        assertEq(vault.totalAllocated(), 800e6);
    }

    function test_payMilestone_transfersUSDC() public {
        vm.prank(funder);
        vault.fundGrant(GRANT_A, 1000e6);

        uint256 builderBefore = usdc.balanceOf(builder);

        vm.prank(registry);
        vault.payMilestone(GRANT_A, MILESTONE_1, builder, 250e6);

        assertEq(usdc.balanceOf(builder), builderBefore + 250e6);
        assertEq(vault.grantPaid(GRANT_A), 250e6);
    }

    function test_payMilestone_emitsEvent() public {
        vm.prank(funder);
        vault.fundGrant(GRANT_A, 1000e6);

        vm.expectEmit(true, true, false, true);
        emit GrantVault.MilestonePaid(GRANT_A, MILESTONE_1, builder, 250e6);

        vm.prank(registry);
        vault.payMilestone(GRANT_A, MILESTONE_1, builder, 250e6);
    }

    function test_payMilestone_revertsIfNotRegistry() public {
        vm.prank(funder);
        vault.fundGrant(GRANT_A, 1000e6);

        vm.prank(attacker);
        vm.expectRevert(GrantVault.OnlyRegistry.selector);
        vault.payMilestone(GRANT_A, MILESTONE_1, attacker, 1000e6);
    }

    function test_payMilestone_revertsIfInsufficientBalance() public {
        vm.prank(funder);
        vault.fundGrant(GRANT_A, 100e6);

        vm.prank(registry);
        vm.expectRevert(GrantVault.InsufficientGrantBalance.selector);
        vault.payMilestone(GRANT_A, MILESTONE_1, builder, 500e6);
    }

    function test_payMilestone_tracksPaidCorrectly() public {
        vm.prank(funder);
        vault.fundGrant(GRANT_A, 1000e6);

        vm.startPrank(registry);
        vault.payMilestone(GRANT_A, keccak256("m1"), builder, 200e6);
        vault.payMilestone(GRANT_A, keccak256("m2"), builder, 300e6);
        vm.stopPrank();

        assertEq(vault.grantPaid(GRANT_A), 500e6);
        assertEq(vault.availableBalance(GRANT_A), 500e6);
    }

    function test_availableBalance_decreasesAfterPayout() public {
        vm.prank(funder);
        vault.fundGrant(GRANT_A, 1000e6);

        assertEq(vault.availableBalance(GRANT_A), 1000e6);

        vm.prank(registry);
        vault.payMilestone(GRANT_A, MILESTONE_1, builder, 400e6);

        assertEq(vault.availableBalance(GRANT_A), 600e6);
    }

    function test_unallocatedBalance_returnsCorrectly() public {
        usdc.mint(address(vault), 500e6);

        assertEq(vault.unallocatedBalance(), 500e6);

        vm.prank(funder);
        vault.fundGrant(GRANT_A, 100e6);

        assertEq(vault.unallocatedBalance(), 500e6);
    }

    function test_recoverUnallocated_sendsUnallocatedOnly() public {
        usdc.mint(address(vault), 500e6);
        vm.prank(funder);
        vault.fundGrant(GRANT_A, 200e6);

        vm.prank(committee);
        vault.recoverUnallocated(committee);

        assertEq(vault.totalAllocated(), 200e6);
    }

    function test_recoverUnallocated_revertsIfNotOwner() public {
        usdc.mint(address(vault), 100e6);
        vm.prank(attacker);
        vm.expectRevert();
        vault.recoverUnallocated(attacker);
    }

    function testFuzz_fundAndPay(uint96 fundAmount, uint96 payAmount) public {
        vm.assume(fundAmount > 0 && payAmount > 0 && payAmount <= fundAmount);

        usdc.mint(funder, fundAmount);
        vm.prank(funder);
        usdc.approve(address(vault), fundAmount);

        vm.prank(funder);
        vault.fundGrant(GRANT_A, fundAmount);

        vm.prank(registry);
        vault.payMilestone(GRANT_A, MILESTONE_1, builder, payAmount);

        assertEq(vault.grantPaid(GRANT_A), payAmount);
        assertEq(vault.availableBalance(GRANT_A), fundAmount - payAmount);
    }
}
