export function signTypedData(certificate, chainId) {


    return {
        types: {
            Certificate: [
                {name: "name", type: "string"},
                {name: "uniqueId", type: "string"},
                {name: "serial", type: "string"},
                {name: "date", type: "uint256"},
                {name: "owner", type: "address"},
                {name: "metadataHash", type: "bytes32"},
            ],
        },
        primaryType: "Certificate",
        domain: {
            name: process.env.NEXT_PUBLIC_SIGNING_DOMAIN,
            version: process.env.NEXT_PUBLIC_SIGNATURE_VERSION,
            chainId: Number(chainId),
            verifyingContract: process.env.NEXT_PUBLIC_AUTHENTICITY,
        },
        value: {
            name: certificate.name,
            uniqueId: certificate.uniqueId,
            serial: certificate.serial,
            date: certificate.date,
            owner: certificate.owner,
            metadataHash: certificate.metadataHash
        }
    }
}








