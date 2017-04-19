const fs        = require('fs');
const path      = require('path');
const Switcher  = require('../switcher.js')(path.resolve(__dirname, './aws'));
const chai      = require('chai');
chai.use(require("chai-as-promised"));
const expect = chai.expect;

const PROFILES_LIST = [
  {
    name: 'default',
    aws_access_key_id: 'PROFILE2ID',
    aws_secret_access_key: 'PROFILE2SECRET'
  },
  {
    name: 'profile1',
    aws_access_key_id: 'PROFILE1ID',
    aws_secret_access_key: 'PROFILE1SECRET'
  },
  {
    name: 'profile2',
    aws_access_key_id: 'PROFILE2ID',
    aws_secret_access_key: 'PROFILE2SECRET'
  },
  {
    name: 'profile3',
    aws_access_key_id: 'PROFILE3ID',
    aws_secret_access_key: 'PROFILE3SECRET'
  },
];

const ORIGINAL_LIST = `[default]
aws_access_key_id = PROFILE2ID
aws_secret_access_key = PROFILE2SECRET

[profile1]
aws_access_key_id = PROFILE1ID
aws_secret_access_key = PROFILE1SECRET

[profile2]
aws_access_key_id = PROFILE2ID
aws_secret_access_key = PROFILE2SECRET

[profile3]
aws_access_key_id = PROFILE3ID
aws_secret_access_key = PROFILE3SECRET

`

const MODIFIED_LIST = `[default]
aws_access_key_id = PROFILE1ID
aws_secret_access_key = PROFILE1SECRET

[profile1]
aws_access_key_id = PROFILE1ID
aws_secret_access_key = PROFILE1SECRET

[profile2]
aws_access_key_id = PROFILE2ID
aws_secret_access_key = PROFILE2SECRET

[profile3]
aws_access_key_id = PROFILE3ID
aws_secret_access_key = PROFILE3SECRET

`

describe('Switcher test suite', () => {
  it('Should find the credentials file in a directory', () => {
    return expect(Switcher._checkDirectory()).to.be.true;
  });

  it('Should read the profile information correctly into an array of objects', () => {
    return Switcher._getProfileList().then(profiles => {
      profiles.forEach((profile, index) => {
        expect(profile).to.deep.equal(PROFILES_LIST[index])
      })
    })
  });

  it('Should return the correct profile name for the current profile', () => {
    return Switcher.getCurrentProfile()
    .then(name => {
      expect(name).to.equal(PROFILES_LIST[2].name);
    });
  });

  it('Should return the correct profile name when passed an index', () => {
    return Switcher.getProfileNameByIndex(2)
    .then(name => {
      expect(name).to.equal(PROFILES_LIST[2].name);
    });
  });

  it('Should modify the [default] profile correctly when a new profile is specified by name', () => {
    return Switcher.switchProfileByName('profile1')
    .then(() => {
      return new Promise((resolve, reject) => {
        fs.readFile(path.resolve(__dirname, './aws/credentials'), 'utf8', (err, data) => {
          resolve(expect(data).to.equal(MODIFIED_LIST));
        });
      })
    })
    .then(() => Switcher.switchProfileByName('profile2'))
    .then(() => {
      return new Promise((resolve, reject) => {
        fs.readFile(path.resolve(__dirname, './aws/credentials'), 'utf8', (err, data) => {
          resolve(expect(data).to.equal(ORIGINAL_LIST));
        });
      });
    });
  });

  it('Should throw error when given a non-existent directory', () => {
    const directory = path.resolve(__dirname, './nonexistent_directory')
    function createNewSwitcherWithBadDir() {
      return require('../switcher.js')(directory);
    }
    return expect(createNewSwitcherWithBadDir).to.throw(`Given directory does not exist: [${ directory }]`);
  });

  it('Should throw error when trying to read a folder with no credentials', () => {
    const directory = path.resolve(__dirname, './aws_no_credentials')
    function createNewSwitcherWithBadDir() {
      return require('../switcher.js')(directory);
    }
    return expect(createNewSwitcherWithBadDir).to.throw(`No credentials file found in ${ directory }`);
  });

  it('Should throw error when given a credentials file that is blank', () => {
    const directory = path.resolve(__dirname, './aws_blank_credentials')
    function createNewSwitcherWithBadDir() {
      return require('../switcher.js')(directory);
    }
    return expect(createNewSwitcherWithBadDir).to.throw(`Empty credentials file found in ${ directory }`);
  });

  it('Should throw error when given a credentials file that is incorrectly formatted', () => {
    const directory = path.resolve(__dirname, './aws_bad_credentials')
    function createNewSwitcherWithBadDir() {
      return require('../switcher.js')(directory);
    }
    return expect(createNewSwitcherWithBadDir).to.throw(`Incorrectly formatted credentials file found in ${ directory }`);
  });
});
