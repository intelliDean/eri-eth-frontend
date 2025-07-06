/**
 * Enhanced error parser for Ethereum/smart contract errors
 * @param {Error | ethers.ContractError} error - The error object to parse
 * @returns {string} Human-readable error message
 */
const parseError = (error) => {
    // Extract message with fallbacks
    const message = (
        error.data?.message ||
        error.error?.message ||
        error.reason ||
        error.message ||
        "Unknown error"
    ).toString().toLowerCase();

    // Error message mapping (more maintainable than if/else chain)
    const errorMap = {
        // Contract-specific errors
        "address_zero": "Invalid address: Zero address not allowed",
        "already_registered": "Manufacturer already registered",
        "invalid_manufacturer_name": "Manufacturer name must be at least 2 characters",
        "name_not_available": "Manufacturer name is already taken",
        "does_not_exist": "Manufacturer does not exist",
        "invalid_signature": "Invalid signature - authentication failed",
        "not_registered": "User is not registered",
        "username_must_be_at_least_3_letters": "Username must be at least 3 characters",
        "user_does_not_exist": "User not found",
        "item_claimed_already": "Item already claimed",
        "item_doesnt_exist": "Item doesn't exist",
        "cannot_generate_code_for_yourself": "Cannot generate code for yourself",
        "item_not_claimed_yet": "Item not claimed yet",
        "unauthorized": "Unauthorized operation",
        "only_owner": "Only owner can perform this action",

        // Common Ethereum errors
        "user rejected transaction": "Transaction was canceled by user",
        "insufficient funds": "Insufficient funds for transaction",
        "nonce too low": "Network error - please try again",
        "gas limit exceeded": "Transaction requires more gas than allowed",
        "execution reverted": "Transaction reverted by smart contract",
    };

    // Check for matching error keys
    for (const [key, value] of Object.entries(errorMap)) {
        if (message.includes(key)) {
            return value;
        }
    }

    // Handle JSON-RPC error codes
    if (error.code) {
        switch (error.code) {
            case 4001:
                return "Transaction rejected by user";
            case -32603:
                return "Internal JSON-RPC error";
            case -32000:
                return "Invalid input parameters";
        }
    }

    // Fallback: Return original message with cleanup
    return message
        .replace('execution reverted:', '')
        .replace('error:', '')
        .trim() || "An unknown error occurred";
};

function addressZero() {
    return "0x0000000000000000000000000000000000000000";
}

export {addressZero, parseError}