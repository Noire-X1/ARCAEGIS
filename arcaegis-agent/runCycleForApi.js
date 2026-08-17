require("dotenv").config();
const { runPolicyCycle } = require("./policyEngine");

runPolicyCycle()
  .then((decision) => {
    console.log("__CYCLE_RESULT__" + JSON.stringify(decision));
  })
  .catch((err) => {
    console.log("__CYCLE_ERROR__" + JSON.stringify({ message: err.message }));
    process.exit(1);
  });
