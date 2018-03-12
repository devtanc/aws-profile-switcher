'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class Switcher {
  /**
   * Create a switcher
   * @param {String} awsDir - Path to the desired AWS credentials directory
   * @returns {Switcher} - Returns an instance of the Switcher class
   */
  constructor(awsDir) {
    if (awsDir) {
      this.awsDir = path.resolve(__dirname, awsDir);
    } else {
      this.awsDir = path.resolve(process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE, '.aws');
    }

    // Directory must exist
    if (!fs.existsSync(this.awsDir)) {
      throw new Error(`Given directory does not exist: [${this.awsDir}]`);
    }

    // Directory must contain a credentials file
    if (!this._checkDirectory(this.awsDir)) {
      throw new Error(`No credentials file found in ${this.awsDir}`);
    }

    // Credentials file must contain valid profile data
    const result = this._checkCredentialsFile(this.awsDir);
    if (result === 'empty') {
      throw new Error(`Empty credentials file found in ${this.awsDir}`);
    } else if (result === 'bad') {
      throw new Error(`Incorrectly formatted credentials file found in ${this.awsDir}`);
    }

    const configResult = this._checkConfigFile(this.awsDir);
    if (configResult === 'good') {
      this.processConfig = true;
    } else {
      this.processConfig = false;
    }

    this.profileData = this._getCredentials().then(profileData => {
      return this._getConfig(profileData);
    });
  }

  /**
   * Prints out profiles from the credentials file
   * Does not list the 'default' profile
   * (that's the one we're using to store the currently active profile)
   * @returns {Promise.<undefined>} - Returns an empty resolved Promise
   */
  listProfiles() {
    return this._getProfileList()
    .then(profiles => {
      return profiles.filter(profile => {
        return !profile.name.match(new RegExp(/default/, 'i'));
      }).forEach((profile, index) => {
        console.log(chalk.green(`${index + 1}: ${profile.name}`));
      });
    })
    .catch(this.errHandler);
  }

  /**
   * Overwrites the [default] profile with the profile that matches @name
   * @param {String} name - The [name] of the profile to set as the default
   * @returns {Promise}   - Returns the promise from the _writeBackCredentialsData function
   */
  switchProfileByName(name) {
    return this.profileData.then(data => {
      const defaultProfileIndex = data.findIndex(profile => profile.name === 'default');
      const newProfile = Object.assign({}, data.find(p => p.name === name));

      delete newProfile.name;
      data[defaultProfileIndex] = Object.assign(data[defaultProfileIndex], newProfile);
      return this._writeBackCredentialsData(data);
    })
    .catch(this.errHandler);
  }

  /**
   * Finds ~the first~ profile that contains the same aws_access_key_id as the [default] profile
   * @returns {String} - The name of the matching profile
   */
  getCurrentProfile() {
    return this.profileData.then(data => {
      const defaultProfile = data.find(profile => profile.name === 'default');
      const newProfile = data.find(p =>
        p.aws_access_key_id === defaultProfile.aws_access_key_id &&
        p.name !== 'default'
      );

      return newProfile.name;
    })
    .catch(this.errHandler);
  }

  /**
   * Returns the name of the profile at the given index
   * @param {String|Number} index - Index of the desired profile
   * @returns {String} - The name of the matching profile
   */
  getProfileNameByIndex(index) {
    return this.profileData.then(data => data[index].name);
  }

  /**
   * @returns {Promise.<Array>} - Array of profile objects
   */
  _getProfileList() {
    return this.profileData.catch(this.errHandler);
  }

  /**
   * Checks that the credentials file exists
   *
   * @returns {Boolean} - True if 'credentials' file is found
   */
  _checkDirectory() {
    return fs.readdirSync(this.awsDir, 'utf8').indexOf('credentials') > -1;
  }

  /**
   * Checks that the credentials file has valid data
   *
   * @returns {String} - Status of the file's contents
   */
  _checkCredentialsFile() {
    const contents = fs.readFileSync(`${this.awsDir}/credentials`, 'utf8');
    if (contents === '') {
      return 'empty';
    }
    const regexMatch = contents.match(/\[.*\]\n* *aws_access_key_id *= *[A-Z0-9]+\n* *aws_secret_access_key *= *.*/);
    if (regexMatch) {
      return 'good';
    }
    return 'bad';
  }

  /**
   * Checks that the config file has valid data
   *
   * @returns {String} - Status of the file's contents
   */
  _checkConfigFile() {
    if (!fs.existsSync(`${this.awsDir}/config`)) {
      return 'bad';
    }
    const contents = fs.readFileSync(`${this.awsDir}/config`, 'utf8');
    if (contents === '') {
      return 'empty';
    }
    const regexMatch = contents.match(/\[.*\]\n* *output *= *.*\n *region *= *.*/);
    if (regexMatch) {
      return 'good';
    }
    return 'bad';
  }

  /**
   * Parses the credentials file into an Array of profile objects
   *
   * @returns {Promise.<Array>} - Array of profile objects
   * @reject {Error} - fs.readFile error
   */
  _getCredentials() {
    return new Promise((resolve, reject) => {
      fs.readFile(`${this.awsDir}/credentials`, 'utf8', (err, data) => {
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

          // This regex will match [.*] and extract interior characters as the second array item
          // matches[0] = [AAAA]
          // matches[1] = AAAA
          const matches = curr.match(/\[(.*)\]/);

          // If this is a profile name, push a new profile object to the array with the name
          if (matches) {
            const [, name] = matches;
            prev.push({ name });
            return prev;
          }

          /*
          * At this point this line is neither blank nor a profile name
          * Which means it's either an AWS profile ID or a secret which are formatted like:
          *  aws_access_key_id=ACCESS_KEY_ID
          *  aws_secret_access_key=SECRET_ACESS_KEY
          * With possible spaces in between the '=' and the key/value
          */

          // Split on '=' and then remove any spaces
          // [0] === 'aws_access_key_id'  || [0] === 'aws_secret_access_key'
          // [1] === ACCESS_KEY_ID        || [1] === SECRET_ACESS_KEY
          const [key, value] = curr.split('=').map(section => section.replace(' ', ''));

          // Find an existing array object with a defined name and less then 3 object properties
          // Each profile object should end up with 3 properties:
          // [name, aws_access_key_id, aws_secret_access_key]
          // Only the most recent profile object will have a defined name and less then 3 properties
          const profile = prev.find(p =>
            p.name !== undefined &&
            Object.keys(p).length < 3
          );

          profile[key] = value;
          return prev;
        }, []); // Pass in an empty array to start the reduce

        return resolve(data);
      });
    })
    .then(data => this._handleMissingDefaultProfile(data));
  }

  /**
   * Parses the config file into an Array of profile objects,
   * appends the config settings to the existing profile object
   *
   * @param {array} Profile objects - Existing array or profile objects
   * @returns {Promise.<Array>} - Array of profile objects
   * @reject {Error} - fs.readFile error
   */
  _getConfig(profileData) {
    if (this.processConfig) {
      return new Promise((resolve, reject) => {
        fs.readFile(`${this.awsDir}/config`, 'utf8', (err, data) => {
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

            // This regex will match [.*] and extract interior characters as the second array item
            // matches[0] = [AAAA]
            // matches[1] = AAAA
            const matches = curr.match(/\[(.*)\]/);

            // If this is a profile name, push a new profile object to the array with the name
            if (matches) {
              // The config file user the pattern [profile profileName], need to strip the word profile
              const [, name] = matches.map(match => match.replace(/profile/i, '').trim());
              const existingProfile = prev.find(p =>
                p.name !== undefined &&
                Object.keys(p).length < 5
              );
              if (!existingProfile) {
                prev.push({ name });
              }
              return prev;
            }

            /*
            * At this point this line is neither blank nor a profile name
            * Which means it's either an AWS profile ID or a configuration which are are formatted like:
            *  output = OUTPUT
            *  region = REGION
            * With spaces in between the '=' and the key/value
            */

            // Split on '=' and then remove any spaces
            // [0] === 'output'  || [0] === 'region'
            // [1] === OUTPUT    || [1] === REGION
            const [key, value] = curr.split('=').map(section => section.replace(' ', ''));

            // Find an existing array object with a defined name and less then 5 object properties
            // Each profile object should end up with 5 properties:
            // [name, aws_access_key_id, aws_secret_access_key, region, output]
            // Only the most recent profile object will have a defined name and less then 5 properties
            const profile = prev.find(p =>
              p.name !== undefined &&
              Object.keys(p).length < 5
            );

            profile[key] = value;
            return prev;
          }, profileData || []); // Pass in the existing profileDate of an empty array to start the reduce
          return resolve(data);
        });
      });
    }
    return Promise.resolve(profileData);
  }

  /**
   * Writes the credentials data back to the credentials file
   *
   * @param {Object[]} profile - Array of profile objects
   * @param {String} profile.name                   - The profile's name (no square brackets)
   * @param {String} profile.aws_access_key_id      - The profile's access key ID (from AWS)
   * @param {String} profile.aws_secret_access_key  - The profile's secret access key (from AWS)
   * @param {String} profile.output  - The profile's output type
   * @param {String} profile.region  - The profile's region location
   * @returns {Promise.<undefined>} - Returns an empty resolved Promise
   * @reject {Error} - Error writing the credentials file
   */
  _writeBackCredentialsData(data) {
    let writeData = '';
    let configData = '';

    data.forEach(profile => {
      writeData = writeData.concat(`[${profile.name}]\n`);
      writeData = writeData.concat(`aws_access_key_id = ${profile.aws_access_key_id}\n`);
      writeData = writeData.concat(`aws_secret_access_key = ${profile.aws_secret_access_key}\n\n`);
      if (this.processConfig) {
        if (profile.name === 'default') {
          configData = configData.concat(`[${profile.name}]\n`);
        } else {
          configData = configData.concat(`[profile ${profile.name}]\n`);
        }
        if (profile.output) {
          configData = configData.concat(`output = ${profile.output}\n`);
        }
        if (profile.region) {
          configData = configData.concat(`region = ${profile.region}\n`);
        }
        configData = configData.concat(`\n`);
      }
    });

    const credentialPromise = new Promise((resolve, reject) => {
      fs.writeFile(`${this.awsDir}/credentials`, writeData, err => {
        if (err) {
          return reject(err);
        }
        return resolve();
      });
    });
    const configPromise = new Promise((resolve, reject) => {
      if (this.processConfig) {
        fs.writeFile(`${this.awsDir}/config`, configData, err => {
          if (err) {
            return reject(err);
          }
          return resolve();
        });
      } else {
        return resolve();
      }
    });

    return Promise.all([credentialPromise, configPromise]);
  }

  /**
   * Checks the profile array to make sure that there is a default profile object
   * (in case no default was specified in the credentials file)
   * If not, then one is created and defaulted to the first profile's data
   *
   * @param {Object[]} profile - Array of profile objects
   * @param {String} profile.name                   - The profile's name (no square brackets)
   * @param {String} profile.aws_access_key_id      - The profile's access key ID (from AWS)
   * @param {String} profile.aws_secret_access_key  - The profile's secret access key (from AWS)
   * @returns {Promise.<Array>} - Array of profile objects
   */
  _handleMissingDefaultProfile(profileData) {
    return new Promise(resolve => {
      if (profileData.find(profile => profile.name === 'default')) {
        return resolve(profileData);
      }

      const defaultProfile = Object.assign({}, profileData[0]);
      defaultProfile.name = 'default';
      profileData.unshift(defaultProfile);

      return this._writeBackCredentialsData(profileData)
      .then(() => resolve(profileData));
    });
  }
}

module.exports = path => {
  return new Switcher(path);
};
