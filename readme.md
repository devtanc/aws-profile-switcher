# AWS Profile Switcher

[![Build Status](https://travis-ci.org/devtanc/aws-profile-switcher.svg?branch=master)](https://travis-ci.org/devtanc/aws-profile-switcher)

A simple command line utility that allows you to switch your default aws profile found at `~/.aws/credentials`

Let me know via GitHub if you notice any issues on a given OS. I'm open to any suggestions.

Install: `npm install -g aws-profile-switcher`

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

*The alias for 'current' was 'curr' previous to v1.0.0



Examples given the following `~/.aws/credentials` file:

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

(This is not a sequence of commands. Assume each is done ina separate environment on the above file.)

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