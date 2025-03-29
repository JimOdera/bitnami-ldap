# LDAP Operations with Docker

This project demonstrates LDAP operations such as adding, modifying, and deleting users, as well as checking user login and searching entries using Docker. It also includes an Express server for handling LDAP operations via HTTP endpoints.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
- [Running Tests](#running-tests)
- [API Endpoints](#api-endpoints)
- [License](#license)

## Prerequisites

Ensure you have the following installed:

- Docker
- Docker Compose
- Node.js (>=14.x)
- npm (>=6.x)

## Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/yourusername/ldap-docker.git
cd ldap-docker
npm install
```

## Environment Variables

Create a `.env` file in the root directory and set the following environment variables:

```env
LDAP_URL=ldap://localhost:1389
LDAP_ADMIN_USER=admin
LDAP_ADMIN_PASSWORD=adminpassword
LDAP_BASE_DN=dc=example,dc=com
PORT=3000
```

## Usage

### Start the Services

1. Start the LDAP server and the application using Docker Compose:

```bash
docker-compose up
```

2. Start the Express server:

```bash
npm start
```

You should see the following output:

```plaintext
Server running on port 3000
```

## Running Tests

Run the integration tests:

```bash
npm test
```

## API Endpoints

The Express server provides the following endpoints for LDAP operations:

- **POST /users**: Adds a new user to the LDAP directory.
- **POST /login**: Checks if a user can log in with the provided credentials.
- **GET /users**: Searches for users based on a search query.

### Example Requests

- **Add User**

```bash
curl -X POST http://localhost:3000/users -H "Content-Type: application/json" -d '{
  "username": "testuser",
  "password": "testpassword",
  "email": "testuser@example.com",
  "firstName": "Test",
  "lastName": "User"
}'
```

- **Check Login**

```bash
curl -X POST http://localhost:3000/login -H "Content-Type: application/json" -d '{
  "username": "testuser",
  "password": "testpassword"
}'
```

- **Search Users**

```bash
curl -X GET http://localhost:3000/users?search=testuser
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
