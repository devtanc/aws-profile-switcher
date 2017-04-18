const chalk       = require('chalk');
const path        = require('path');
const fs          = require('fs');
const homePath    = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
const awsDir      = process.env.SWITCHER_ENV === 'test' ? path.resolve(__dirname, './test') : path.resolve(homePath, '.aws');
const profileData = checkDirectory().then(getCredentials).catch(errHandler);

/**
 * @returns {Promise.<Array>} - Array of profile objects
 */
exports.getProfileList = () => {
  return profileData.catch(errHandler);
};

/**
 * Prints out profiles from the [~/.aws/credentials] file
 * Does not list the 'default' profile
 * (that's the one we're using to store the currently active profile)
 * @returns {Promise.<undefined>} - Returns an empty resolved Promise
 */
exports.listProfiles = () => {
  return exports.getProfileList()
  .then(profiles => {
    return profiles.filter(profile => {
      return !profile.name.match(new RegExp(/default/, 'i'));
    }).forEach((profile, index) => {
      console.log(chalk.green(`${ index + 1 }: ${ profile.name }`));
    });
  })
  .catch(errHandler);
}

/**
 * Overwrites the [default] profile with the profile that matches @name
 * @param {String} name - The [name] of the profile to set as the default
 * @returns {Promise}   - Returns the promise from the writeBackConfigData function
 */
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

/**
 * Finds ~the first~ profile that contains the same aws_access_key_id as the [default] profile
 * @returns {String} - The name of the matching profile
 */
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

/**
 * Returns the name of the profile at the given index
 * @param {String|Number} index - Index of the desired profile
 * @returns {String} - The name of the matching profile
 */
exports.getProfileNameByIndex = index => {
  return profileData.then(data => data[index].name);
};

/**
 * 
 * 
 * @param {Object[]} profile - Array of profile objects
 * @param {String} profile.name                     - The profile's name (no square brackets)
 * @param {String} profile.aws_access_key_id        - The profile's access key ID (from AWS)
 * @param {String} profile.aws_secret_access_key    - The profile's secret access key (from AWS)
 * @returns {Promise.<undefined>} - Returns an empty resolved Promise
 * @reject {Error} - Error writing the [~/.aws/.credentials] file
 */
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

/**
 * Simply prints out errors and rethrows
 * 
 * @param {Error} err 
 */
function errHandler(err) {
  console.log(chalk.bold.red(err.message, err));
  throw err;
}

/**
 * Checks that the [~/.aws/credentials] file exists
 * 
 * @returns {Promise.<undefined>} - Returns an empty resolved Promise
 * @reject  {String} - Error string
 */
function checkDirectory() {
  return new Promise((resolve, reject) => {
    console.log(awsDir)
    fs.readdir(awsDir, 'utf8', (err, files) => {
      if(files.find(name => name === 'credentials')) {
        return resolve();
      }
      return reject(`No credentials file found in ${ awsDir }`)
    });
  });
}

/**
 * Parses the [~/.aws/credentials] file into an Array of profile objects
 * 
 * @returns {Promise.<Array>} - Array of profile objects
 * @reject {Error} - fs.readFile error
 */
function getCredentials() {
  return new Promise((resolve, reject) => {
    fs.readFile(`${ awsDir }/credentials`, 'utf8', (err, data) => {
      if (err) {
        return reject(err);
      }

      // Separate into lines
      data = data.split('\n');

      // Reduce the lines into an array of profile objects
      data = data.reduce((prev, curr) => {
        // Skip blank lines in the file
        if (curr === '') {
          return prev;
        }

        // This regex will match the '[name]' format and extract 'name'
        const matches = curr.match(/\[(.*)\]/);

        //If this is a profile name, push a new profile object to the array with the name
        if (matches) {
          prev.push({
            // matches[0] === '[name]'
            // matches[1] === 'name' <- This is the one we want
            name: matches[1],
          });
          return prev;
        }

        /*
         * At this point this line is neither blank nor a profile name
         * Which means it's either an AWS profile ID or a secret which are formatted:
         *  aws_access_key_id=ACCESS_KEY_ID
         *  aws_secret_access_key=SECRET_ACESS_KEY
         * With possible spaces in between the '=' and they key/value
         */

        // Split on '=' and then remove any spaces
        const sections = curr.split('=').map(section => section.replace(' ', ''));

        // Find an existing array object with a defined name and less then 3 object properties
        // Each profile object should end up with 3 properties: [name, aws_access_key_id, aws_secret_access_key]
        // Only the most recent profile object will have a defined name and less then 3 properties
        const profile = prev.find(p =>
          p.name !== undefined &&
          Object.keys(p).length < 3
        );

        // sections[0] === 'aws_access_key_id'  || sections[0] === 'aws_secret_access_key'
        // sections[1] === ACCESS_KEY_ID        || sections[1] === SECRET_ACESS_KEY
        profile[sections[0]] = sections[1];
        return prev;
      }, []); // Pass in an empty array to start

      return resolve(data);
    });
  });
}
