const chalk       = require('chalk');
const path        = require('path');
const fs          = require('fs');
const homePath    = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
const awsDir      = process.env.AWS_PATH_TEST || path.resolve(homePath, '.aws');
const FULL        = 3;
const profileData = checkDirectory().then(getCredentials).catch(errHandler);

exports.listProfiles = () => {
  return profileData.then(data => {
    return data.filter(profile => {
      return !profile.name.match(new RegExp(/default/, 'i'));
    }).forEach((profile, index) => {
        console.log(chalk.green(`${ index + 1 }: ${ profile.name }`));
    });
  })
  .catch(errHandler);
};

exports.switchProfileByName = name => {
  return profileData.then(data => {
    let defaultProfile = data.find(profile => profile.name === 'default');
    const newProfile = Object.assign({}, data.find(p => p.name === name));

    delete newProfile.name;
    defaultProfile = Object.assign(defaultProfile, newProfile);
    return writeBackConfigData(data);
  })
  .catch(errHandler);
};

exports.getCurrentProfile = () => {
  return profileData.then(data => {
    let defaultProfile = data.find(profile => profile.name === 'default');
    const newProfile = data.find(p =>
      p.aws_access_key_id === defaultProfile.aws_access_key_id &&
      p.name !== 'default'
    );

    return newProfile.name;
  })
  .catch(errHandler);
};

exports.getProfileNameByIndex = index => {
  return profileData.then(data => data[index].name);
};

function writeBackConfigData(data) {
  let writeData = '';

  data.forEach(profile => {
    writeData = writeData.concat(`[${ profile.name }]\n`);
    writeData = writeData.concat(`aws_access_key_id = ${ profile.aws_access_key_id }\n`);
    writeData = writeData.concat(`aws_secret_access_key = ${ profile.aws_secret_access_key }\n\n`);
  });

  return new Promise((resolve, reject) => {
    fs.writeFile(`${ awsDir }/credentials`, writeData, err => {
      if (err) {
        return reject(err);
      }
      return resolve();
    });
  });
}

function errHandler(err) {
  console.log(chalk.bold.red(err.message, err));
  throw err;
}

function checkDirectory() {
  return new Promise((resolve, reject) => {
    fs.readdir(awsDir, 'utf8', (err, files) => {
      if(files.find(name => name === 'credentials')) {
        return resolve();
      }
      return reject(`No credentials file found in ${ awsDir }`)
    });
  });
}

function getCredentials() {
  return new Promise((resolve, reject) => {
    fs.readFile(`${ awsDir }/credentials`, 'utf8', (err, data) => {
      if (err) {
        return reject(err);
      }

      data = data.split('\n');
      data = data.reduce((prev, curr) => {
        if (curr === '') {
          return prev;
        }

        const matches = curr.match(/\[(.*)\]/);

        if (matches) {
          prev.push({
            name: matches[1],
          });
          return prev;
        }

        const sections = curr.split('=').map(section => section.replace(' ', ''));

        const profile = prev.find(p =>
          p.name !== undefined &&
          Object.keys(p).length < FULL
        );

        profile[sections[0]] = sections[1];
        return prev;
      }, []);

      return resolve(data);
    });
  });
}
