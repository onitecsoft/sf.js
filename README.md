# sf.js
Native Javascript framework

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
