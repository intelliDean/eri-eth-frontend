export function getEvents(contract, receipt, eventName) {

    const event = receipt.logs
        .map((log) => {
            try {
                return contract.interface.parseLog(log);
            } catch {
                return null;
            }
        })
        .find((parsed) => parsed?.name === eventName);

    if (!event) throw new Error(`${eventName} event not found`);
    // const { ownershipCode, tempOwner } = event.args;

    return event.args;
}