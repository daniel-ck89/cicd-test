const ChainIdHelper = require("@keplr-wallet/cosmos");
const fs = require("fs");
const axios = require("axios");

const readFile = (path, opts = "utf8") =>
  new Promise((resolve, reject) => {
    fs.readFile(path, opts, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

async function checkValidate() {
  return await getSuggestChains()
    .then(async (result) => {
      let suggestChains = result;

      if (suggestChains) {
        console.log(
          "suggestChains has been loaded.. number of suggestChain : " +
            suggestChains.length
        );
        for await (const suggestChain of suggestChains) {
          console.log("====================================");
          console.log(
            "Start verification suggestChain data : " +
              JSON.stringify(suggestChain)
          );
          checkIdentifier(suggestChain);
          await checkRequirmentFields(suggestChain);

          await checkRpcAndRest(suggestChain);

          await checkRequirmentFeatures(suggestChain);
        }
        console.log("====================================");
      } else {
        throw new Error("suggestChains is empty");
      }

      console.log("All verification procedures have been passed.");

      return { isValid: true };
    })
    .catch((err) => {
      console.log("Validation failed. " + err);
      return {
        isValid: false,
        error: err.message,
      };
    });
}

async function getSuggestChains() {
  const projectRootDirectory = ".";
  const searchTargetFolders = [];
  let searchTargetFiles;
  let suggestChains = [];

  let files = await fs.promises.readdir(projectRootDirectory, {
    withFileTypes: true,
  });

  files.forEach((file) => {
    if (
      file.isDirectory() &&
      file.name !== ".git" &&
      file.name !== ".github" &&
      file.name !== "node_modules" &&
      file.name !== "src"
    ) {
      searchTargetFolders.push(file);
    }
  });

  if (searchTargetFolders.length > 0) {
    const allowedExtensions = /(\.json)$/i;
    try {
      for await (const folder of searchTargetFolders) {
        console.log("searching folder = " + folder.name);
        searchTargetFiles = await fs.promises.readdir(
          projectRootDirectory + "/" + folder.name,
          {
            withFileTypes: false,
          }
        );

        try {
          for await (const file of searchTargetFiles) {
            if (!allowedExtensions.exec(file) || file.split(".").length != 2) {
              throw new Error(
                "The file name does not match the rules : '" + file + "'"
              );
            } else {
              const suggestChainData = await readFile(
                projectRootDirectory + "/" + folder.name + "/" + file
              );

              try {
                const parsedData = JSON.parse(suggestChainData);
                parsedData.fileName = file;
                suggestChains.push(parsedData);
              } catch (err) {
                throw new Error(
                  "This suggestChainData is not in json format : '" + file + "'"
                );
              }
            }
          }
        } catch (err) {
          throw err;
        }
      }
    } catch (err) {
      throw err;
    }
  }

  if (suggestChains && suggestChains.length > 0) {
    return suggestChains;
  } else {
    throw new Error("There is no Suggest chain to validate.");
  }
}

function checkIdentifier(suggestChain) {
  if (suggestChain.chainId) {
    try {
      let chain = getChainIdentifier(suggestChain.chainId);
      const fileName = suggestChain.fileName.split(".")[0];
      if (chain.identifier != fileName) {
        throw new Error(
          "chain.identifier and file name do not match. chain.identifier : " +
            chain.identifier +
            ", fileName : " +
            fileName
        );
      }
      console.log("chainId verification successful : " + JSON.stringify(chain));
    } catch (err) {
      throw err;
    }
  } else {
    throw new Error("There is no chainId : " + JSON.stringify(suggestChain));
  }
}

function getChainIdentifier(chainId) {
  let chainIdentifier;
  try {
    chainIdentifier = ChainIdHelper.ChainIdHelper.parse(chainId);
  } catch (err) {
    throw new Error("Unsupported format of chainId : " + chainId);
  }

  return chainIdentifier;
}

async function checkRequirmentFields(suggestChain) {
  if (!suggestChain)
    throw new Error(
      "suggestChain data is empty : " + JSON.stringify(suggestChain)
    );

  // chainName
  if (!suggestChain.chainName || suggestChain.chainName.length == 0)
    throw new Error("There is no chainName : " + JSON.stringify(suggestChain));

  // stakeCurrency
  // coinDenom, coinMinimalDenom, coinDecimals
  if (suggestChain.stakeCurrency) {
    await checkCurrency("stakeCurrency", suggestChain.stakeCurrency);
  } else {
    throw new Error(
      "There is no stakeCurrency : " + JSON.stringify(suggestChain)
    );
  }

  // coinType
  if (suggestChain.bip44 && suggestChain.bip44.coinType) {
    if (!isNumber(suggestChain.bip44.coinType))
      throw new Error(
        "bip44.coinType must be a number : " +
          JSON.stringify(suggestChain.bip44)
      );
  } else {
    throw new Error(
      "There is no bip44.coinType : " + JSON.stringify(suggestChain)
    );
  }

  // bech32Config
  // bech32PrefixAccAddr, bech32PrefixAccPub, bech32PrefixValAddr, bech32PrefixValPub, bech32PrefixConsAddr, bech32PrefixConsPub
  if (suggestChain.bech32Config) {
    if (!suggestChain.bech32Config.bech32PrefixAccAddr) {
      throw new Error(
        "There is no bech32Config.bech32PrefixAccAddr : " +
          JSON.stringify(suggestChain)
      );
    }
    if (!suggestChain.bech32Config.bech32PrefixAccPub) {
      throw new Error(
        "There is no bech32Config.bech32PrefixAccPub : " +
          JSON.stringify(suggestChain)
      );
    }
    if (!suggestChain.bech32Config.bech32PrefixValAddr) {
      throw new Error(
        "There is no bech32Config.bech32PrefixValAddr : " +
          JSON.stringify(suggestChain)
      );
    }
    if (!suggestChain.bech32Config.bech32PrefixValPub) {
      throw new Error(
        "There is no bech32Config.bech32PrefixValPub : " +
          JSON.stringify(suggestChain)
      );
    }
    if (!suggestChain.bech32Config.bech32PrefixConsAddr) {
      throw new Error(
        "There is no bech32Config.bech32PrefixConsAddr : " +
          JSON.stringify(suggestChain)
      );
    }
    if (!suggestChain.bech32Config.bech32PrefixConsPub) {
      throw new Error(
        "There is no bech32Config.bech32PrefixConsPub : " +
          JSON.stringify(suggestChain)
      );
    }
  } else {
    throw new Error(
      "There is no bech32Config : " + JSON.stringify(suggestChain)
    );
  }

  // currencies
  if (suggestChain.currencies && suggestChain.currencies.length > 0) {
    try {
      for await (const currency of suggestChain.currencies) {
        await checkCurrency("currency", currency);
      }
    } catch (err) {
      throw err;
    }
  } else {
    throw new Error("There is no currencies : " + JSON.stringify(suggestChain));
  }

  // feeCurrencies
  if (suggestChain.feeCurrencies && suggestChain.feeCurrencies.length > 0) {
    try {
      for await (const feeCurrency of suggestChain.feeCurrencies) {
        await checkCurrency("feeCurrency", feeCurrency);
      }
    } catch (err) {
      throw err;
    }
  } else {
    throw new Error(
      "There is no feeCurrencies : " + JSON.stringify(suggestChain)
    );
  }
}

// coinDenom, coinMinimalDenom, coinDecimals
async function checkCurrency(parentName, currency) {
  try {
    if (!currency.coinDenom)
      throw new Error(
        "There is no " + parentName + ".coinDenom : " + JSON.stringify(currency)
      );
    if (!currency.coinMinimalDenom)
      throw new Error(
        "There is no " +
          parentName +
          ".coinMinimalDenom : " +
          JSON.stringify(currency)
      );
    if (!currency.coinDecimals) {
      throw new Error(
        "There is no " +
          parentName +
          ".coinDecimals : " +
          JSON.stringify(currency)
      );
    } else if (!isNumber(currency.coinDecimals)) {
      throw new Error(
        "currency.coinDecimals must be a number : " + JSON.stringify(currency)
      );
    }
  } catch (err) {
    throw err;
  }
}

async function checkRpcAndRest(suggestChain) {
  if (suggestChain.rpc) {
    try {
      const rpcUrl = suggestChain.rpc + "/status";
      const response = await request(rpcUrl);

      if (response?.status === 200) {
        if (response.data.result.node_info.network !== suggestChain.chainId) {
          throw new Error(
            "Invalid rpc server. your chainId : " +
              suggestChain.chainId +
              ", your rpc node network : " +
              response.data.result.node_info.network
          );
        }

        console.log("rpc verification successful : " + rpcUrl);
      } else {
        throw new Error("RPC check failed. url : " + rpcUrl);
      }
    } catch (err) {
      throw err;
    }
  } else {
    throw new Error("There is no rpc : " + JSON.stringify(suggestChain));
  }

  if (suggestChain.rest) {
    try {
      const restUrl = suggestChain.rest + "/staking/parameters";
      const response = await request(restUrl);
      if (response?.status === 200) {
        console.log("rest verification successful : " + restUrl);
      } else {
        throw new Error("Rest check failed. url : " + restUrl);
      }
    } catch (err) {
      console.log(err.message);
      throw err;
    }
  } else {
    throw new Error("There is no rest : " + JSON.stringify(suggestChain));
  }
}

async function checkRequirmentFeatures(suggestChain) {
  const requirmentFeatures = [];

  // check ibc-go
  console.log("checking ibc-go...");
  try {
    const response = await request(
      suggestChain.rest + "/ibc/apps/transfer/v1/params"
    );
    if (response?.status === 200) {
      requirmentFeatures.push("ibc-go");
    }
  } catch (err) {
    throw err;
  }

  // check ibc-transfer
  console.log("checking ibc-transfer...");
  try {
    let path;
    if (requirmentFeatures.includes("ibc-go")) {
      path = "/ibc/apps/transfer/v1/params";
    } else {
      path = "/ibc/applications/transfer/v1beta1/params";
    }
    const response = await request(suggestChain.rest + path);
    if (response?.status === 200) {
      requirmentFeatures.push("ibc-transfer");
    }
  } catch (err) {
    throw err;
  }

  //check wasmd_0.24+
  console.log("checking wasmd_0.24+...");
  try {
    const response = await request(
      suggestChain.rest + "/cosmwasm/wasm/v1/contract/test/smart/test"
    );
    if (response?.status === 400) {
      requirmentFeatures.push("cosmwasm");
      requirmentFeatures.push("wasmd_0.24+");
    }
  } catch (err) {
    throw err;
  }

  //check cosmwasm
  if (!requirmentFeatures.includes("wasmd_0.24+")) {
    console.log("checking cosmwasm...");
    try {
      const response = await request(
        suggestChain.rest + "/wasm/v1/contract/test/smart/test"
      );
      if (response?.status === 400) {
        requirmentFeatures.push("cosmwasm");
      }
    } catch (err) {
      throw err;
    }
  }

  //check osmosis-txfees
  console.log("checking osmosis-txfees...");
  try {
    const response = await request(
      suggestChain.rest + "/osmosis/txfees/v1beta1/base_denom"
    );
    if (response?.status === 200) {
      requirmentFeatures.push("osmosis-txfees");
    }
  } catch (err) {
    throw err;
  }

  //check axelar-evm-bridge
  console.log("checking axelar-evm-bridge...");
  try {
    const response = await request(
      suggestChain.rest + "/axelar/evm/v1beta1/token_info/test"
    );
    if (response?.status === 400) {
      requirmentFeatures.push("axelar-evm-bridge");
    }
  } catch (err) {
    throw err;
  }

  // start features validation
  console.log("features on SuggestChain data : " + suggestChain.features);

  //check missingFeatures with result
  const missingFeatures = [];

  if (requirmentFeatures.length > 0) {
    if (suggestChain.features) {
      requirmentFeatures.forEach((requirmentFeature) => {
        if (!suggestChain.features.includes(requirmentFeature)) {
          missingFeatures.push(requirmentFeature);
        }
      });
    } else {
      missingFeatures.push(requirmentFeatures);
    }
  }

  console.log("requirmentFeatures : " + requirmentFeatures);

  if (missingFeatures.length > 0) {
    console.log("missingFeatures : " + missingFeatures);
    throw new Error(
      "There are missing features. Please add this Features : " +
        missingFeatures
    );
  } else {
    console.log("There are no missing features.");
  }

  //check notImplementedFeatures with suggestChain.features
  const notImplementedFeatures = [];
  if (suggestChain.features) {
    suggestChain.features.forEach((feature) => {
      if (!requirmentFeatures.includes(feature)) {
        notImplementedFeatures.push(feature);
      }
    });
  }

  if (notImplementedFeatures.length > 0) {
    console.log("notImplementedFeatures : " + notImplementedFeatures);
    throw new Error(
      "There are not implemented Features on suggestChain. Please delete this Features : " +
        notImplementedFeatures
    );
  } else {
    console.log("There are no Features need to delete.");
  }
}

async function request(url) {
  return await axios
    .get(url)
    .then(function (response) {
      return response;
    })
    .catch(function (err) {
      return err.response;
    });
}

function isNumber(data) {
  const result = Number(data);
  if (result) {
    return true;
  } else {
    return false;
  }
}

module.exports = {
  checkValidate,
};
