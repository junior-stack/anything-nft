require("dotenv").config();
const { makeid } = require("./helpers");
const { Conflux } = require('js-conflux-sdk')
const s3 = require("../database/s3");

// cfx init
const cfx = new Conflux({
    url:'https://test.confluxrpc.com',
    networkId: 1
})
const managerAccount = cfx.wallet.addPrivateKey(process.env.MANAGER_KEY)
const { abi } = require('../assets/InftyNft.json')
const minterContract = cfx.Contract({abi, address:process.env.MINTER_ADDRESS})

async function nextTokenId() {
    return await minterContract.totalSupply() + 1n;
}

async function mint(addr, uri) {
    return await minterContract.mint(addr, uri).sendTransaction({from: process.env.MANAGER_ADDRESS}).executed()
}

async function transferOwnershipOnChain(fromAddr, toAddr, tokenID){
    return await minterContract.transferFrom(fromAddr, toAddr, tokenID).sendTransaction({from: process.env.MANAGER_ADDRESS}).executed()
}

async function transferCfxTo(toAddr, price) {
    const tx = {
        from: process.env.MANAGER_ADDRESS,
        to: toAddr,
        value: 1e18*price,
        chainId: 1
    }
    const hash = await cfx.sendTransaction(tx).executed();
    console.log(hash)
}

async function generateUri(req, imageUri, sha) {
    const metaData = {
        title: "Asset Metadata",
        type: "object",
        properties: {
            name: {
                type: 'string',
                description: req.body.title
            },
            description:{
                type: 'string',
                description: req.body.description
            },
            image: {
                type: 'string',
                description: imageUri
            }
        }
    }
    const data = await s3.putObject({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: sha,
        Body: JSON.stringify(metaData),
        ContentType: "application/json"}).promise()
    return `https://conflux-infty.s3.amazonaws.com/${sha}`
}

// TODO
function actualTokenId(addr, uri, guess) {
    const totalTokens = minterContract.balanceOf(addr);
    if (totalTokens == 0) {
        console.log("Error! NFT haven't been minted to this addr");
    }
    return minterContract.tokenOfOwnerByIndex(addr, totalTokens - 1);
}


module.exports = {
    nextTokenId,
    mint,
    actualTokenId,
    generateUri,
    transferOwnershipOnChain,
    transferCfxTo
}