# sf.js
Native Javascript framework
Contains <a href="https://github.com/onitecsoft/smarti.data.js">smarti.data.js</a> and <a href="https://github.com/onitecsoft/smarti.to.js">smarti.to.js</a> (user sf.data, sf.to, sf.parse)

<b>1. Define instance</b> (it initializes at ```DOMContentLoaded``` event)
```html
<div sf="myNamespace.myInstance">
...
</div>
```
or call on content loaded via ajax (in case if content contains sf instances)
```js
sf.init(HtmlElement container)
```
<b>2. Attach model</b>
```html
<script>
  var model = { name: 'test' };
</script>
<div sf="test" sf-load="model">
...
</div>
```
or
```html
<script>
  var loadModel = function(sender){
    $.ajax(
      ...
      success: function(model){
        sender.load(model);
        //or
        test.load(model);
      }
    );
  }
</script>
<div sf="test" sf-load="loadModel">
...
</div>
```
<b>3. Set actions</b>
```html
<script>
  var model = { greeting: 'Hello!', name: 'World' };
</script>
<div sf="test" sf-load="model">
  <span sf-src="greeting"></span>
  <input type="text" sf-set-value="name" />
</div>
```
Full list of actions and possibilites is comming soon....
