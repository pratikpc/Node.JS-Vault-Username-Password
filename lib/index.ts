import * as NodeVault from "node-vault";

class VaultConfig {
    Path: string = "data";
    Policy: string = "AppPolicy";
    Authority: string[] = [];
    EndPoint: string = "http://localhost:8200";
    UserName: string = "";
    SecretMountPoint: string = "secret";
    CertificateMountPoint: string = "certificate";
    Token: string = String(process.env.VAULT_TOKEN);
}

export class VaultAccess {
    // Use Vault Directly for Low level Operations
    public vault: NodeVault.client;
    public Config: VaultConfig;

    constructor(Config: VaultConfig) {
        // Lower Case All Params
        {
            Config.Policy = Config.Policy + "/" + Config.UserName;
            Config.Path = Config.SecretMountPoint + "/" + Config.Path + "/" + Config.UserName;
            Config.Policy = Config.Policy.toLowerCase();
            Config.Path = Config.Path.toLowerCase();
            Config.SecretMountPoint = Config.SecretMountPoint.toLowerCase();
            Config.UserName = Config.UserName.toLowerCase();
        }
        this.Config = Config;
        this.vault = NodeVault.default({
            apiVersion: "v1",
            endpoint: this.Config.EndPoint,
            token: this.Config.Token
        });
    }
    public async Setup() {
        await this.InitVault();
        await this.InitLogin();
        await this.Mount();
        await this.AddPolicy();
    }
    public async InitVault() {
        const check_init = await this.vault.initialized();
        if (Boolean(check_init.initialized))
            return;
        const init = await this.vault.init({ secret_shares: 1, secret_threshold: 1 });
        this.vault.token = init.root_token;
        const key = init.keys[0];
        await this.vault.unseal({ secret_shares: 1, key });
    }
    public async InitLogin() {
        const auths = await this.vault.auths();
        if (auths.hasOwnProperty("userpass/"))
            return null;
        return await this.vault.enableAuth({
            mount_point: 'userpass',
            type: 'userpass',
            description: 'userpass auth',
        });
    }

    public async MountPresent(mountPoint: string = this.Config.SecretMountPoint){
        const mounts = await this.vault.mounts();
        // Check if Mounting was Done
        return (mounts[mountPoint + "/"] != null);
    }

    // This is An Admin Action
    public async Mount(mountPoint: string = this.Config.SecretMountPoint) {
        // Check if Mounting was Done
        if (await this.MountPresent(mountPoint)) {
            return null;
        }
        return await this.vault.mount({
            mount_point: mountPoint,
            type: 'kv',
            description: 'Data Storage Mounted'
        });
    }
    // This is An Admin Action
    public async Unmount(mountPoint: string = this.Config.SecretMountPoint) {
        // Check if Mounting was Done
        if (await this.MountPresent(mountPoint)) {
            return null;
        }
        return await this.vault.unmount({
            mount_point: mountPoint
        });
    }

    // Will Throw Exception on Sign In Failure
    public async SignIn(password: string, username: string = this.Config.UserName) {
        const user = await this.vault.userpassLogin({
            username, password
        });
        this.Config.UserName = username;
        return user;
    }

    public async UsersGet() {
        const users = (await this.vault.list(`auth/userpass/users`)).data.keys as string[];
        return users;
    }

    public async SignUp(password: string, username: string = this.Config.UserName, policy: string = this.Config.Policy) {
        const users = await this.UsersGet();
        if (!users.includes(username))
            return null;
        this.Config.UserName = username;
        this.Config.Policy = this.Config.Policy + "/" + this.Config.UserName;
        return await this.vault.write(`auth/userpass/users/${username}`, { password, policies: policy });
    }
    public async PoliciesGet() {
        return (await this.vault.policies()).policies as string[];
    }
    public async AddPolicy(policy: string = this.Config.Policy, mount_point: string = this.Config.Path, authority: string[] = this.Config.Authority, policy_add: boolean = false) {
        if (!policy_add) {
            const policies = await this.PoliciesGet();
            if (policies.includes(policy))
                return null;
        }
        return await this.vault.addPolicy({
            name: policy,
            rules: `path "${mount_point}/*" { capabilities = ${JSON.stringify(authority)} }`
        });
    }

    public async Write(key: string, value: any) {
        return await this.vault.write(`${this.Config.Path}/${key}`, {
            value: value
        });
    }
    public async Read(key: string) {
        return (await this.vault.read(`${this.Config.Path}/${key}`)).data.value;
    }
    public async Delete(key: string) {
        return await this.vault.read(`${this.Config.Path}/${key}`);
    }

}