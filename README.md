# import-map-storage-helper <!-- omit in toc -->

Import-map-storage-helper is a CLI tool to assist you managing the storage of your Micro-frontend assets.
If you use [single-spa](https://single-spa.js.org/) coupled with a CI to manage your micro-frontend project, you may generate many assets on your storage provider.
The first goal of the tool is to clean unused assets based on configurable rules to free space (and optimize cost).
Import-map-storage-helper use the [import-map-deployer](https://github.com/single-spa/import-map-deployer) APIs to list used assets. This first version only support Google Cloud Storage and contributions are welcome to add more storage providers.

- [Installation](#installation)
  - [Node](#node)
  - [Docker](#docker)
- [Usage](#usage)
- [Configuration](#configuration)
  - [storage](#storage)
  - [import-map-deployer](#import-map-deployer)
  - [defaultAction](#defaultaction)
  - [rules](#rules)
  - [rules samples](#rules-samples)
    - [delete old development version](#delete-old-development-version)

## Installation

### Node

Install from npm registry

```sh
npm install --global import-map-storage-helper
```

### Docker

A docker image is available in the [official Docker registry](https://hub.docker.com/r/dolmentech/import-map-storage-helper).

## Usage

```sh
im-storage-helper help
```

the main command is `clean` :

```sh
  ____  _                               _   _      _
 / ___|| |_ ___  _ __ __ _  __ _  ___  | | | | ___| |_ __   ___ _ __
 \___ \| __/ _ \| '__/ _` |/ _` |/ _ \ | |_| |/ _ \ | '_ \ / _ \ '__|
  ___) | || (_) | | | (_| | (_| |  __/ |  _  |  __/ | |_) |  __/ |
 |____/ \__\___/|_|  \__,_|\__, |\___| |_| |_|\___|_| .__/ \___|_|
                           |___/                    |_|

Usage: im-storage-helper clean [options]

clean storage following the rules provided

Options:
  -d, --dry-run              Do not delete file, only print Action
  -c, --config <configfile>  configuration file path (relative to the current directory)
  -h, --help                 display help for command
```

## Configuration

The default configuration file is a `config.json` file in the current directory.
The `--config` option let specify a configuration file path.

The configuration file must be as followed :

```json
{
  "storage": {
    "type": "gcs",
    "bucket": "my-assets",
    "pathPrefix": "my-prefix/",
    "assetBaseUrl": "https://assets.domain.com/"
  },
  "importMapDeployer": {
    "url": "http://localhost:5000"
  },
  "defaultAction": "keep",
  "rules": [
    {
      "name": "my-rule",
      "action": "keep",
      "versionSelector": "regex",
      "olderThan": {
        "amount": 2,
        "unit": "month"
      }
    },
    {
      "name": "my-rule2",
      "action": "delete",
      "olderThan": {
        "amount": 3,
        "unit": "month"
      }
    },
    {
      "name": "my-rule3",
      "action": "delete",
      "versionSelector": ".*-to-delete$"
    }
  ]
}
```

### storage

Note that you must have the `GOOGLE_APPLICATION_CREDENTIALS` environment variable set for authentication.

- `type`: Storage type (Google Cloud Storage = gcs). Only `gcs` available.
- `bucket`: Google Storage bucket name
- `pathPrefix` (Optional): the base path of assets in the bucket. It must end with a `/`.

The bucket may be organized like :

```
pathPrefix
    |- application1
    |   |- version1
    |   |   |- files
    |   |- version2
    |   |   |- files
    |- application2
    |   |- version1
    |   |   |- files
    |   |- version2
    |   |   |- files
```

- `assetBaseUrl`: This the begining of the public URL assets. It must end with a `/`.
  Assets must accessed by `${assetUrl}${pathPrefix}application1/version1/...`
  This URL must be the one used in the **import-map**.

### import-map-deployer

Note that you must have the `IMD_USERNAME` and `IMD_PASSWORD` environment variables set for authentication.

- `url`: URL of [import-map-deployer](https://github.com/single-spa/import-map-deployer).

### defaultAction

This is the action performed when no rule match for application version. It can be one of `keep` or `delete`.

### rules

Rules are the cleanning logic. They describe which application version must be kept and which must be deleted.

A rule has the following properties :

- `name`: The rule name
- `action`: The action to perform. (`keep` or `delete`)
- `versionSelector` (optional): A [javascript string pattern Regexp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp) to select a version the rule can be applied

- `olderThan` (optional): An object that represent a Duration. This let apply the rule only on version orlder than the given duration
  - `amount`: The amount of time
  - `unit`: The unit of the amount given. This must be one of [available unit](https://day.js.org/docs/en/manipulate/add#list-of-all-available-units).

### rules samples

#### delete old development version

Assuming that the development version look like `2.4.0-dev.3` and match `"^\\d*.\\d*.\\d*-dev.\\d*"`.
To delete development versions more than 3 weeks old use the following configuration :

```json
{
  [...]
  "defaultAction": "keep",
  "rules": [
    {
      "name": "dev-3weeks-old",
      "action": "delete",
      "versionSelector": "^\\d*.\\d*.\\d*-dev.\\d*",
      "olderThan": {
        "amount": 3,
        "unit": "week"
      }
    }
  ]
}
```
