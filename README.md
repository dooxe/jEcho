jecho
---

# Create a sound
```javascript
var audio = jecho.Audio.load('my/file').then(function()
{
	audio.play();
});
```

# What can I do with this audio ?
You can:
* change the pitch
* change the volume
* change the pan
* make it loop
* change the position
* add filters

For more information, please check the API:
https://dooxe.github.io/jecho/index.html

# Filtering
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
