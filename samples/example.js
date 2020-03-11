// process.env.DEBUG = 'node-vault'; // switch on debug mode
const {VaultAccess} = require("../dist");

const Vault = new VaultAccess({
    Authority: ["create", "read", "update", "delete", "list", "sudo"],
    Path: 'path',
    Policy: 'auth_policy',
    EndPoint: 'http://localhost:8200',
    UserName: "username",
    SecretMountPoint: 'secret_zone',
    Token: String(process.env.VAULT_TOKEN),
    CertificateMountPoint: "certificate"
})

async function run() {
    await Vault.Setup();
    // Uncomment to SignUp
    // await Vault.SignUp('password');
    await Vault.SignIn('password' /*, 'username' */);
    await Vault.Write('key', {
        foo: '3',
        bar: '4'
    });
    const val = await Vault.Read('key');
    // await Vault.Unmount();
    console.log(val);
}

run().then(() => { console.log("done") })