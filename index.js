require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const ldap = require('ldapjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());
app.use(morgan('dev'));

const LDAP_CONFIG = {
    url: process.env.LDAP_URL,
    connectTimeout: 10000,
    reconnect: true
};

function createLdapClient() {
    return ldap.createClient(LDAP_CONFIG);
}

app.post('/users', async (req, res) => {
    const client = createLdapClient();
    const { username, password, email, firstName, lastName } = req.body;

    const adminDN = `cn=${process.env.LDAP_ADMIN_USER},${process.env.LDAP_BASE_DN}`;

    client.bind(adminDN, process.env.LDAP_ADMIN_PASSWORD, async (bindErr) => {
        if (bindErr) {
            client.unbind();
            return res.status(500).json({ error: `Admin bind failed: ${bindErr.message}` });
        }

        try {
            await verifyOrCreateOU(client);
        } catch (ouError) {
            client.unbind();
            return res.status(500).json({ error: `OU verification failed: ${ouError.message}` });
        }

        const userDN = `uid=${username},ou=users,${process.env.LDAP_BASE_DN}`;
        const userEntry = {
            objectClass: ['inetOrgPerson', 'organizationalPerson', 'person', 'top'],
            uid: username,
            cn: `${firstName} ${lastName}`,
            sn: lastName,
            mail: email,
            userPassword: password
        };

        client.add(userDN, userEntry, (addErr) => {
            client.unbind();
            if (addErr) {
                return res.status(500).json({
                    error: `User creation failed: ${addErr.message}`,
                    ldapMessage: addErr.lde_message,
                    code: addErr.lde_code
                });
            }
            res.status(201).json({ message: 'User created successfully' });
        });
    });
});

function verifyOrCreateOU(client) {
    return new Promise((resolve, reject) => {
        client.search(`ou=users,${process.env.LDAP_BASE_DN}`, {
            scope: 'base',
            filter: '(objectClass=organizationalUnit)'
        }, (err, res) => {
            if (err) {
                client.unbind();
                return reject(new Error(`LDAP search failed: ${err.message}`));
            }

            let ouExists = false;

            res.on('searchEntry', () => {
                ouExists = true;
            });

            res.on('end', () => {
                if (ouExists) {
                    return resolve();
                }

                const ouEntry = {
                    objectClass: 'organizationalUnit',
                    ou: 'users'
                };
                client.add(`ou=users,${process.env.LDAP_BASE_DN}`, ouEntry, (err) => {
                    if (err) {
                        return reject(new Error(`Failed to create OU: ${err.message}`));
                    }
                    resolve();
                });
            });

            res.on('error', (err) => {
                reject(new Error(`LDAP search error: ${err.message}`));
            });
        });
    });
}

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const userDN = `uid=${username},ou=users,${process.env.LDAP_BASE_DN}`;

    const client = createLdapClient();

    client.bind(userDN, password, (err) => {
        client.unbind();
        if (err) return res.status(401).json({ error: 'Invalid credentials' });
        res.json({ message: 'Login successful' });
    });
});

app.get('/users', (req, res) => {
    const client = createLdapClient();
    const { search } = req.query;

    client.bind(`cn=${process.env.LDAP_ADMIN_USER},${process.env.LDAP_BASE_DN}`, process.env.LDAP_ADMIN_PASSWORD, (err) => {
        if (err) return res.status(500).json({ error: 'LDAP bind failed' });

        const opts = {
            filter: `(|(uid=${search}*)(cn=${search}*)(mail=${search}*))`,
            scope: 'sub',
            attributes: ['uid', 'cn', 'sn', 'mail']
        };

        client.search(`ou=users,${process.env.LDAP_BASE_DN}`, opts, (err, result) => {
            const users = [];

            result.on('searchEntry', (entry) => {
                users.push(entry.object);
            });

            result.on('error', (err) => {
                client.unbind();
                res.status(500).json({ error: err.message });
            });

            result.on('end', () => {
                client.unbind();
                res.json(users);
            });
        });
    });
});

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});