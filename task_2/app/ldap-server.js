const ldap = require('ldapjs');
var assert = require('assert');


function authorize(req, res, next) {
  const isSearch = (req instanceof ldap.SearchRequest);
  if (!req.connection.ldap.bindDN.equals('cn=root') && !isSearch)
    return next(new ldap.InsufficientAccessRightsError());

  return next();
}

const SUFFIX = 'o=example';
const db = {};
const server = ldap.createServer();

server.bind('cn=root', (req, res, next) => {
  if (req.dn.toString() !== 'cn=root' || req.credentials !== 'secret')
    return next(new ldap.InvalidCredentialsError());

  res.end();
  console.log('server bind.');
  return next();
});

server.add(SUFFIX, authorize, (req, res, next) => {
  const dn = req.dn.toString();

  if (db[dn])
    return next(new ldap.EntryAlreadyExistsError(dn));

  db[dn] = req.toObject().attributes;
  res.end();
  return next();
});

server.bind(SUFFIX, (req, res, next) => {
  const dn = req.dn.toString();
  if (!db[dn])
    return next(new ldap.NoSuchObjectError(dn));

  if (!db[dn].userpassword)
    return next(new ldap.NoSuchAttributeError('userPassword'));

  if (db[dn].userpassword.indexOf(req.credentials) === -1)
    return next(new ldap.InvalidCredentialsError());

  res.end();
  return next();
});

server.search(SUFFIX, authorize, (req, res, next) => {
  const dn = req.dn.toString();
  if (!db[dn])
    return next(new ldap.NoSuchObjectError(dn));

  let scopeCheck;

  switch (req.scope) {
  case 'base':
    if (req.filter.matches(db[dn])) {
      res.send({
        dn: dn,
        attributes: db[dn]
      });
    }
    res.end();
    return next();

  case 'one':
    scopeCheck = (k) => {
      if (req.dn.equals(k))
        return true;

      const parent = ldap.parseDN(k).parent();
      return (parent ? parent.equals(req.dn) : false);
    };
    break;

  case 'sub':
    scopeCheck = (k) => {
        return (req.dn.equals(k) || req.dn.parentOf(k));
    };

    break;
  }

  const keys = Object.keys(db);
  for (const key of keys) {
    if (!scopeCheck(key))
      return;

    if (req.filter.matches(db[key])) {
      res.send({
        dn: key,
        attributes: db[key]
      });
    }
  }
  res.end();
  return next();
});


// adding data to server
const client = ldap.createClient({
    url: 'ldap://0.0.0.0:1389'
});

client.on('error', (err) => {
    // handle connection error
    console.log('connection failed.')
})
console.log('connection successful.')

client.bind('cn=root', 'secret', (err) => {
    assert.ifError(err);
});
console.log('bind successful.')

const entry = {
    email: 'abc@abc.com',
    password: 'pass1'
};
client.add('o=example', entry, (err) => { 
    assert.ifError(err);
});
console.log('entry successful.')
    

server.listen(1389, () => {
  console.log('LDAP server up at: %s', server.url);
});