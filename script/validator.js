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
        }
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
  const projectRootDirectory = "./..";
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
      file.name !== "script"
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
                suggestChains.push(JSON.parse(suggestChainData));
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
      let chain = ChainIdHelper.ChainIdHelper.parse(suggestChain.chainId);
      console.log("chainId verification successful : " + JSON.stringify(chain));
    } catch (err) {
      throw new Error(
        "Unsupported format of chainId : " + suggestChain.chainId
      );
    }
  } else {
    throw new Error("There is no chainId : " + JSON.stringify(suggestChain));
  }
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
      await request(suggestChain.rpc + "/status");
      console.log(
        "rpc verification successful : " + JSON.stringify(suggestChain.rpc)
      );
    } catch (err) {
      throw err;
    }
  } else {
    throw new Error("There is no rpc : " + JSON.stringify(suggestChain));
  }

  if (suggestChain.rest) {
    try {
      await request(suggestChain.rest + "/staking/parameters");
      console.log(
        "rest verification successful : " + JSON.stringify(suggestChain.rpc)
      );
    } catch (err) {
      throw err;
    }
  } else {
    throw new Error("There is no rest : " + JSON.stringify(suggestChain));
  }
}

async function request(url) {
  await axios
    .get(url)
    .then(function (response) {
      if (response.status == 200) {
        console.log("Request success : " + url);
      } else {
        throw new Error("URL check failed. Status code : " + response.status);
      }
    })
    .catch(function (err) {
      err.message = "URL check failed. " + err.message + ", Url :" + url;
      console.log("err!! " + err.message);
      throw err;
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
