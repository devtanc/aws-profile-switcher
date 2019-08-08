# AWS Profile Switcher

[![npm](https://img.shields.io/npm/v/@devtanc/aws-profile-switcher.svg)](https://www.npmjs.com/package/@devtanc/aws-profile-switcher)
[![Build Status](https://travis-ci.org/devtanc/aws-profile-switcher.svg?branch=master)](https://travis-ci.org/devtanc/aws-profile-switcher)
[![NPM Downloads](https://img.shields.io/npm/dt/@devtanc/aws-profile-switcher.svg)](https://www.npmjs.com/package/@devtanc/aws-profile-switcher)
[![GitHub issues](https://img.shields.io/github/issues/devtanc/aws-profile-switcher.svg)](https://github.com/devtanc/aws-profile-switcher/issues)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![Known Vulnerabilities](https://snyk.io/test/github/devtanc/aws-profile-switcher/badge.svg)](https://snyk.io/test/github/devtanc/aws-profile-switcher)

A simple command line utility that allows you to switch your default aws profile found at `~/.aws/credentials`.

Let me know via GitHub if you notice any issues on a given OS. I'm open to any suggestions.

**This package was formerly known as just `aws-profile-switcher`, but I lost the credentials for that account and am recovering them. I've been wanting to update this to be a scoped package for a while, so I'll use this opportunity to do so. Once npm can get my account recovered (hopefully) then I'll update the npm page with the deprecation. Sorry for the confusion.**

**JUST TO REITERATE, THE ORIGINAL `aws-profile-switcher` LIBRARY IS NO LONGER MAINTAINED AND THIS WILL BE THE NEW MAINTAINED PACKAGE**

**Install:** `npm install -g @devtanc/aws-profile-switcher`

```
Usage: switcher <command> [options]


  Commands:

    list|ls               Lists available AWS profiles from [~/.aws/credentials]
    current|c             List the current default profile
    switch|sw [options]   Switches the default profile to a different, user-specified profile

  Global Options:

    -h, --help     output usage information
    -V, --version  output the version number

  Switch Command Options:

    -p, --profile  <optional>  The name of the profile to make the default profile
    -i, --index    <optional>  The index of the profile to make the default profile (from list command)
```

_\*The alias for the 'current' command was 'curr' previous to v1.0.0_

# Examples

Given the following `~/.aws/credentials` file. (This is not a sequence of commands. Assume each is done in a separate environment on the file below)

```
[default]
aws_access_key_id = PROFILE_2_ID
aws_secret_access_key = PROFILE_2_SECRET

[profile1]
aws_access_key_id = PROFILE_1_ID
aws_secret_access_key = PROFILE_1_SECRET

[profile2]
aws_access_key_id = PROFILE_2_ID
aws_secret_access_key = PROFILE_2_SECRET

[profile3]
aws_access_key_id = PROFILE_3_ID
aws_secret_access_key = PROFILE_3_SECRET
```

```
Command: switcher ls

Output:
	> Available profiles:
	> 1: profile1
	> 2: profile2
	> 3: profile3

Changes to file: <none>
```

```
Command: switcher curr

Output:
	> Current profile: profile2

Changes to file: <none>
```

```
Command: switcher sw

Output:
	> 1: profile1
	> 2: profile2
	> 3: profile3
	> prompt: index:
Input: 3
Output: Switching default aws profile to profile3

Changes to file:
	  [default]
	- aws_access_key_id = PROFILE_2_ID
	- aws_secret_access_key = PROFILE_2_SECRET
	  [default]
	+ aws_access_key_id = PROFILE_3_ID
	+ aws_secret_access_key = PROFILE_3_SECRET
```

```
Command: switcher sw -p profile1

Output: Switching default aws profile to profile1

Changes to file:
	  [default]
	- aws_access_key_id = PROFILE_2_ID
	- aws_secret_access_key = PROFILE_2_SECRET
	  [default]
	+ aws_access_key_id = PROFILE_1_ID
	+ aws_secret_access_key = PROFILE_1_SECRET
```

```
Command: switcher sw -i 3

Output: Switching default aws profile to profile3

Changes to file:
	  [default]
	- aws_access_key_id = PROFILE_2_ID
	- aws_secret_access_key = PROFILE_2_SECRET
	  [default]
	+ aws_access_key_id = PROFILE_3_ID
	+ aws_secret_access_key = PROFILE_3_SECRET
```

# DISCLAIMER:

Yes, I'm aware of the [built-in](http://docs.aws.amazon.com/cli/latest/userguide/cli-chap-getting-started.html#using-profiles) profile functionality that AWS CLI has. This little tool was written for many reasons:

- Some AWS CLI wrappers don't have `--profile` as an option, so the `export/set` command is the only option
- `switcher sw` is less characters and easier to remember than `exports/set AWS_DEFAULT_PROFILE=profile1` (although a bash alias/function could shorten the # of characters)
- _BUT_ `switcher sw` lists out the profiles so that you don't have to remember the names
- _AND_ more people know how to install an npm package than how to update their `~/.bash_profile` file correctly, most likely
- Changing a profile applies to all shell instances for as long as it is set
