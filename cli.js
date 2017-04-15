#!/usr/bin/env node --harmony
const commander = require('commander');
const prompt = require('prompt');
const chalk = require('chalk');
const fs = require('fs');
const switcher = require('./switcher');

const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, './package.json'), 'utf8'));

commander
.usage('<command> [options]')
.version(data.version);

commander.command('list')
.alias('ls')
.description('Lists available AWS profiles from [~/.aws/credentials]')
.action(() => {
  console.log(chalk.green('Available profiles:'));
  switcher.listProfiles()
  .catch(err => console.error);
});

commander.command('current')
.alias('curr')
.description('List the current default profile')
.action(() => {
  switcher.getCurrentProfile().then(name => {
    return console.log(chalk.green(`Current profile: ${ name }`));
  })
  .catch(err => console.error);
});


commander.command('switch')
.alias('sw')
.description('Switches the default profile to a different, user-specified profile')
.option('-p, --profile  <optional>', 'The name of the profile to make the default profile')
.option('-i, --index <optional>', 'The index of the profile to make the default profile (from list command)')
.action(cmd => {
  if (cmd.profile) {
    console.log(chalk.green(`Switching default aws profile to ${ cmd.profile }`));
    switcher.switchProfileByName(cmd.profile);
  }
  else if (cmd.index) {
    switcher.getProfileNameByIndex(cmd.index).then(name => {
      console.log(chalk.green(`Switching default aws profile to ${ name }`));
      return switcher.switchProfileByName(name);
    })
    .catch(err => console.error);
  }
  else {
    switcher.listProfiles();
    prompt.start();
    prompt.get([ 'index' ], (err, result) => {
      if (err) {
        throw err;
      }
      switcher.getProfileNameByIndex(result.index).then(name => {
        console.log(chalk.green(`Switching default aws profile to ${ name }`));
        return switcher.switchProfileByName(name);
      })
      .catch(err => console.error);
    });
  }
});

commander.on('--help', function() {
  console.log('  Examples:');
  console.log('');
  console.log('    $ switcher list');
  console.log('    $ switcher switch -p profile_name');
  console.log('    $ switcher switch -i 2');
  console.log('');
});

commander.parse(process.argv);
