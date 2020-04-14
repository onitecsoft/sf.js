# sf.js
Native Javascript framework

1. Define instance (it initializes at ```DOMContentLoaded``` event)
```html
<div sf="myNamespace.myInstance">
...
</div>
```
or call ```sf.init(HtmlElement container)``` of content loaded via ajax

2. Attach model
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
    )
  }
</script>
<div sf="test" sf-load="loadModel">
...
</div>
```
