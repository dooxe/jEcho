# jecho
---

jecho is a simple javascript audio library

* Project website: https://dooxe.github.io/jecho/index.html
* API documentation: https://dooxe.github.io/jecho/api/index.html

## Get started

1. [Download](https://github.com/dooxe/jecho/archive/master.zip) the latest
version of `jecho`
2. Create a webpage and include `jecho` inside:
```html
<head>
	<script src="path/to/libs/jecho/dist/jecho.min.js"></script>
</head>
```
3. Have fun with audio :)

## Create a sound
```javascript
var audio = jecho.Audio.load('my/file').then(function()
{
	audio.play();
});
```

## What can I do with this audio ?

* change the pitch
* change the volume
* change the pan
* make it loop
* change the position
* add filters
* ... may be more !

For more information, please check the API:
https://dooxe.github.io/jecho/index.html

## Filtering
```javascript
var audio = new jecho.Audio();
audio.addFilter(jecho.AudioFilter.create(
	function(channel,input,output,length)
	{
		for(var i = 0; i < length; ++i)
		{
			output[i] = 0.5 * input[i];
		}
	})
);
audio.load('my/file').then(function()
{
	audio.play();
});
```
