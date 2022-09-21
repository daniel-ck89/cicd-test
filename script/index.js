const validator = require("./validator.js");

test();

async function test() {
  const checkValidateResult = await validator.checkValidate();
  console.log("checkValidateResult = " + JSON.stringify(checkValidateResult));
}
