const switcher  = require('../switcher');
const fs        = require('fs');
const path      = require('path');
const chai      = require('chai');
chai.use(require('chai-spies'));
chai.use(require("chai-as-promised"));
const expect = chai.expect;

const PROFILES_LIST = [
  {
    name: 'default',
    aws_access_key_id: 'PROFILE_2_ID',
    aws_secret_access_key: 'PROFILE_2_SECRET'
  },
  {
    name: 'profile1',
    aws_access_key_id: 'PROFILE_1_ID',
    aws_secret_access_key: 'PROFILE_1_SECRET'
  },
  {
    name: 'profile2',
    aws_access_key_id: 'PROFILE_2_ID',
    aws_secret_access_key: 'PROFILE_2_SECRET'
  },
  {
    name: 'profile3',
    aws_access_key_id: 'PROFILE_3_ID',
    aws_secret_access_key: 'PROFILE_3_SECRET'
  },
];

describe('Switcher test suite', () => {
  it('Should read the correct profile information', () => {
    switcher.getProfileList().then(profiles => {
      profiles.forEach((profile, index) => {
        expect(profile).to.deep.equal(PROFILES_LIST[index])
      })
    })
  });
});
