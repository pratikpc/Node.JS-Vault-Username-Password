# [Node.JS-Vault-Username-Password](https://github.com/pratikpc/Node.JS-Vault-Username-Password)

A sample code for Node.JS [Vault by Hashicorp](https://www.hashicorp.com/products/vault) involving [Username and Password based Authentication](https://learn.hashicorp.com/vault/secrets-management/sm-static-secrets#step-1-enable-kv-secrets-engine). This ensures that all data is securely stored behind username-password based authentication.

In case a user, has no desire to store Secrets on the Vault, this code can also be used for User Authentication as well.

For further details regarding Password Based Auth, check out [https://learn.hashicorp.com/vault/secrets-management/sm-static-secrets](https://learn.hashicorp.com/vault/secrets-management/sm-static-secrets)

This code also tries to ensure that One User cannot access data of another user present in the Vault.

Install with
`npm i node-vault-user-pass `

## [Sample Code](samples/index.js)

#### CONFIGURATION

```javascript
// process.env.DEBUG = 'node-vault'; // switch on debug mode
const { VaultAccess } = require("node-vault-user-pass");
```

#### Initialize

```javascript
const Vault = new VaultAccess({
  Authority: ["create", "read", "update", "delete", "list", "sudo"],
  Path: "path",
  Policy: "auth_policy",
  EndPoint: "http://localhost:8200",
  UserName: "username",
  SecretMountPoint: "secret_zone",
  // Either Set this in Command Line as an Environment Variable
  // Use set VAULT_TOKEN or export VAULT_TOKEN depending
  // upon your OS
  // Or Provide it as String Here
  // This must be a Root Token
  // Or a token with substantial access
  Token: String(process.env.VAULT_TOKEN),
  // Yet to be Implemented
  CertificateMountPoint: "certificate"
});
```

#### RUNNING

```javascript
async function run() {
  // In Order to run Setup, the user needs Root Token
  await Vault.Setup();
  await Vault.SignUp("password" /*'username'*/);
  console.log("Sign Up Successfull");
  await Vault.SignIn("password" /*'username'*/);
  console.log("Sign In Successfull");

  const value = {
    foo: "3",
    bar: "4"
  };
  await Vault.Write("key", value);
  console.log("Wrote Value", value, "successfully");
  const val = await Vault.Read("key");
  console.log("Read value is ", val);

  // Unmount is an admin action
  // As such, the user needs Root Token
  // Or At least access to /sys/mount provided
  await Vault.Unmount();
}

run().then(() => {
  console.log("done");
});
```

## Reason for Creation

1. To Ensure Secured Access to data
2. To Ensure Secured Storage of Data
3. This Project was mostly born out of a linkage with A Blockchain Based project where we needed to store Public and Private Keys in a secure manner

## TODO

1. [Add Support for Certificates](https://www.vaultproject.io/api-docs/secret/pki/)

#### DEPENDENCIES

1. [node-vault](https://www.npmjs.com/package/node-vault "node-vault") Library for API Calls to Vault

#### RUNNING Vault

You can run Vault via Docker. I have created a [simple script to run Vault with Docker](https://github.com/pratikpc/Docker-Common-Configs/blob/master/Vault%20Docker%20Starter.bat).

#### Contact Us

You could contact me [via LinkedIn](https://www.linkedin.com/in/pratik-chowdhury-889bb2183/ "via LinkedIn")
You could file issues or add features via Pull Requests on GitHub
