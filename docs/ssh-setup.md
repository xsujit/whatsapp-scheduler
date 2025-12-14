# 🔑 Setting Up SSH Key Access for a Development User

This guide provides step-by-step instructions for generating a new, modern SSH key on a Windows machine and configuring key-based access for a development user (`dev`) on a Linux server (VPS).

---

## 💻 Phase 1: Generate the New SSH Key (On Windows)

This phase generates a secure private/public key pair on your local Windows machine.

1.  **Open PowerShell** on your Windows computer.

2.  Run the following command to generate a new modern key (`Ed25519`) specifically for this user.
    * The key is named `dev_user` for organization.
    * When asked for a passphrase, you can enter one (more secure) or leave it empty (faster login, less secure).

    ```powershell
    ssh-keygen -t ed25519 -C "dev-user-key" -f $HOME\.ssh\dev_user
    ```

3.  Display the content of the public key (`.pub` file) so you can copy it.
    * Run this command and **copy the entire output** (the long string starting with `ssh-ed25519`).

    ```powershell
    Get-Content $HOME\.ssh\dev_user.pub
    ```

---

## ☁️ Phase 2: Add the Key to the Server (Via Root)

Since you already have root access to the VPS, you will use it to safely set up the `dev` user's authorized keys.

1.  Log in to your VPS as root:

    ```bash
    ssh root@<your_ip_address>
    ```

2.  Switch to the `dev` user account. This ensures all files created belong to `dev`, not `root`.

    ```bash
    su - dev
    ```

3.  Create the `.ssh` directory (if it doesn't exist) and open the `authorized_keys` file using the `nano` editor:

    ```bash
    mkdir -p ~/.ssh
    nano ~/.ssh/authorized_keys
    ```

4.  **Paste the public key** you copied from Windows (from Phase 1) into this file.

5.  **Save and Exit `nano`:**
    * Press `Ctrl+O`, then `Enter` to save.
    * Press `Ctrl+X` to exit.

6.  Set the correct security permissions. SSH is strict about permissions; if they are too open, it will reject the key.

    ```bash
    chmod 700 ~/.ssh
    chmod 600 ~/.ssh/authorized_keys
    ```

7.  Type `exit` to return to the `root` user, and `exit` again to disconnect from the server.

---

## ⚙️ Phase 3: Configure Quick Access (On Windows)

This phase configures your local SSH client to connect to the server using a simple hostname alias, avoiding the need to type the full key path every time.

1.  **Open PowerShell** on your Windows computer.

2.  Check if an SSH config file already exists:

    ```powershell
    Test-Path $HOME\.ssh\config
    ```

3.  If the output is **`False`**, create the file:

    ```powershell
    New-Item -Type File $HOME\.ssh\config
    ```

4.  Open the config file in Notepad:

    ```powershell
    notepad $HOME\.ssh\config
    ```

5.  Add the following configuration block at the bottom of the file (replace `123.123.123.123` with your actual server IP address):

    ```plaintext
    Host hetzner-dev
      HostName 123.123.123.123
      User dev
      IdentityFile ~/.ssh/dev_user
    ```

6.  **Save and close** Notepad.

### Test the Connection

You can now connect to your server as the `dev` user using the simple alias:

```powershell
ssh hetzner-dev