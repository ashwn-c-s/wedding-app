const test=require('node:test'),assert=require('node:assert/strict');
const {validateGuestLocation}=require('../dist/lib/guest-location');
test('location accepts precise coordinates including zero and a supported Maps link',()=>{
 assert.deepEqual(validateGuestLocation({type:'coordinates',latitude:0,longitude:0,accuracy_m:12.3,address:' Home '}),{type:'coordinates',latitude:0,longitude:0,accuracy_m:12.3,address:'Home'});
 for(const maps_url of ['https://maps.app.goo.gl/AbC','https://goo.gl/maps/test','https://www.google.com/maps?q=10,76','https://maps.google.com/?q=10,76'])assert.equal(validateGuestLocation({type:'maps',maps_url}).maps_url,maps_url);
 assert.equal(validateGuestLocation(null),null);
});
test('location rejects invalid, incomplete, mixed, unsafe and excessive input',()=>{
 for(const value of [undefined,[],{}, {type:'coordinates',latitude:91,longitude:0},{type:'coordinates',latitude:0},{type:'coordinates',latitude:'10',longitude:0},{type:'coordinates',latitude:NaN,longitude:0},{type:'coordinates',latitude:0,longitude:0,accuracy_m:-1},{type:'coordinates',latitude:0,longitude:0,maps_url:'https://maps.app.goo.gl/x'},...['http://maps.app.goo.gl/x','javascript:alert(1)','https://maps.app.goo.gl.evil.test/x','https://maps.app.goo.gl@evil.test/x','https://evil.test/maps','https://google.com/search?q=x','https://maps.app.goo.gl:8080/x'].map(maps_url=>({type:'maps',maps_url})),{type:'maps',maps_url:'https://maps.app.goo.gl/x',address:'x'.repeat(501)},{type:'maps',maps_url:'https://maps.app.goo.gl/x',secret:true}])assert.throws(()=>validateGuestLocation(value));
});
