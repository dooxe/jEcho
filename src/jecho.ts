//
// Copyright 2017 Maxime Daisy @ http://dooxe-creative.net/
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

//
//
//
var HTMLAudio;
if(typeof Audio !== 'undefined')
{
	HTMLAudio = Audio;
}

/**
*	@module jecho
*/
/**
*	The main library module.
*	@class jecho
*/
namespace jecho
{
	//
	//
	//
	const audioContext = new AudioContext();

	/**
	*	The vailable drivers for the audio management.
	*	@property drivers
	*	@param {String} drivers.UNBUFFERED
	*	@param {String} drivers.BUFFERED
	*	@type Object
	*/
	export const drivers = {
		get UNBUFFERED():string{return "unbuffered"},
		get BUFFERED()	:string{return "buffered"}
	};

	/**
	*	Contains all the event types that can be fired in `jecho`.
	*	@property events
	*	@param {String} events.LOAD
	*	@param {String} events.LOAD_PROGRESS
	*	@param {String} events.PAN_CHANGED
	*	@param {String} events.PITCH_CHANGED
	*	@param {String} events.VOLUME_CHANGED
	*	@param {String} events.POSITION_CHANGED
	*	@param {String} events.DURATION_AVAILABLE
	*	@type Object
	*/
	export const events = {
		get LOAD()					:string { return 'load'; },
		get LOAD_PROGRESS()			:string { return 'loadprogress'; },
		get PAN_CHANGED()			:string { return 'panchanged'; },
		get PITCH_CHANGED()			:string { return 'pitchchanged'; },
		get VOLUME_CHANGED()		:string	{ return 'volumechanged'; },
		get POSITION_CHANGED()		:string	{ return 'positionchanged'; },
		get DURATION_AVAILABLE()	:string	{ return 'durationavailable'; }
	}

	/**
	*	Load an audio file
	*	@static
	*	@method load
	*	@param src {String} The audio source filename / URL
	*/
	export function load(src:string):Promise<Audio>
	{
		return new Audio().load(src);
	}

	/**
	*	Convert the given number of seconds into a readable
	*	time format.
	*	@static
	*	@method formatTime
	*	@param {Integer} seconds
	*	@param {String} format The format to use
	*	<ul>
	*		<li>`h` will be replaced by the number of hours
	*		<li>`m` will be replaced by the number of minutes
	*		<li>`s` will be replaced by the number of seconds
	*	</ul>
	*	Default is `'m:s'`.
	*	@example
	*		var time = 4*60*60 + 25*60 + 11;
	*		var timeStr = jecho.formatTime(time,'h:m:s');
	*		console.log(timeStr);
	*		// "04:25:11"
	*	@return {String} A string representation of the time
	*/
	export function formatTime(seconds:number, format:string = 'm:s'):string
	{
		var numberOfSeconds:number	= Math.floor(seconds);
		var numberOfMinutes:number	= Math.floor(numberOfSeconds/60);
		var numberOfHours:number	= Math.floor(numberOfMinutes/60);

		var hrs:string = numberOfHours.toString();
		if(numberOfHours < 10) hrs = '0'+hrs;

		numberOfMinutes -= numberOfHours*60;

		var min:string = numberOfMinutes.toString();
		if(numberOfMinutes < 10) min = '0'+min;

		numberOfSeconds -= numberOfMinutes*60+numberOfHours*60*60;
		var sec:string = numberOfSeconds.toString();
		if(numberOfSeconds < 10) sec = '0'+sec;

		return format
			.replace('h',hrs)
			.replace('m',min)
			.replace('s',sec)
		;
	}

	//
	//
	//
	//
	//
	class Signals {

		//
		private _source:Object;

		//
		private _listeners:Object;

		//
		constructor(source:Object){
			this._source = source;
			this._listeners = {};
		}

		//
		//
		//
		on(type:string,callback:Function):void {
			if(!this._listeners[type])
			{
				this._listeners[type] = [];
			}
			this._listeners[type].push(callback);
		}

		//
		//
		//
		dispatch(type:string, ...args: any[]){
			var listeners = this._listeners[type];
			if(listeners)
			{
				for(let l of listeners)
				{
					l.apply(this._source, args);
				}
			}
		}
	}

	/**
	*	Base class of all the audio filters.
	*	@class jecho.AudioFilter
	*/
	export abstract class AudioFilter
	{
		/**
		*	<b>[ absract ]</b> Filter an audio buffer.
		*	@method filter
		*	@param {Integer}	channel	The channel number
		*	@param {Array}		input	The input data buffer
		*	@param {Array}		output	The output data buffer
		*	@param {Integer}	length	The length of the buffers
		*/
		public filter(channel,input,output,length):void { }

		/**
		*	Create a new filter with Z transform expressions
		*	@static
		*	@method createZ
		*	@param {Function} zFilterFunction The `zFilterFunction` prototype is the following:
		*	<br/>
		*	`function(x,y,i){}` with
		*	<ul>
		*		<li>`x` the input buffer</li>
		*		<li>`y` the output buffer</li>
		*		<li>`i` the current output index</li>
		*	</ul>
		*	@return {jecho.AudioFilter} The newly created filter
		*	@example
		*		// This filter decreases the output volume
		*		// by a factor of two.
		*		audio.addFilter(jecho.createZFilter(function(x,y,i)
		*		{
		*			var outSample = x[i];
		*			outSample *= 0.5;
		*			return outSample;
		*		}));
		*/
		public static createZ(zFilterFunction:Function=(x,y,i)=>{})
		{
			var indices = [0,0];
			var xi		= [[],[]];
			var yi		= [[],[]];
			return {
				filter : function(channel,input,output,length)
				{
					for(var i = 0; i < length; ++i)
					{
						var index  = indices[channel];
						var x = xi[channel][index] = input[i];
						var y = yi[channel][index] = zFilterFunction(xi[channel],yi[channel],index);
						output[i] = y;
						indices[channel]++;
					}
				}
			};
		}

		/**
		*	Create a new filter from a filter function.
		*	@static
		*	@method createFilter
		*	@param {Function} filterFunction Function that will filter the
		*	audio data buffer. Its prototype is the following:
		*	`function(channel,input,output,length){}`.
		*	@return {jecho.AudioFilter}
		*/
		public static create(filterFunction):any
		{
			var allSamples = [[],[]];
			var indices = [0,0];
			return {
				filter : function(channel,input,output,length)
				{

				}
			};
		}

		/**
		*	Create a low pass filter.
		*	@static
		*	@method createLowPass
		*	@param {float} alpha The cutoff frequency between 0 and 2
		*	@return {jecho.AudioFilter} A low-pass filter
		*/
		createLowPass(alpha)
		{
			return jecho.AudioFilter.createZ((x,y,i)=>{
                var out = x[i];
                if(i > 0)
                {
                    out = y[i-1] + alpha * (x[i]-y[i-1]);
                }
                return out;
            });
		}
	}

	//
	//
	//
	//
	//
	abstract class AudioDriver
	{
		//
		private _signals:Signals;

		//
		public constructor()
		{
			this._signals = new Signals(this);
		}

		//
		protected get signals():Signals
		{
			return this._signals;
		}

		//
		public on(type:string,callback:Function):void
		{
			this.signals.on(type,callback);
		}

		//
		public abstract set fftSize(size:number);

		//
		public abstract get fftSize():number;

		//
		public abstract load(audio:Audio,src:string):Promise<Audio>;

		//
		public abstract play():void;

		//
		public abstract pause():void;

		//
		public abstract stop();

		//
		public abstract set loop(loop:boolean);

		//
		public abstract get loop():boolean;

		//
		public abstract set position(p:number);

		//
		public abstract get position():number;

		//
		public abstract set pitch(p:number);

		//
		public abstract get pitch():number;

		//
		public abstract set pan(p:number);

		//
		public abstract get pan():number;

		//
		public abstract set volume(p:number);

		//
		public abstract get volume():number;

		//
		public abstract get isPlaying():boolean;

		//
		public abstract get duration():number;

		//
		public abstract get spectrum():any;

		//
		public abstract get waveform():any;

		//
		public abstract addFilter(filter):void;

		//
		public abstract removeFilter(filter):void;
	}

	//
	//
	//
	//
	abstract class WebAudioDriver extends AudioDriver
	{
		private _spectrum		: Uint8Array;

		private _spectrumSize	: number;

		private _waveform		: Uint8Array;

		private _waveformSize	: number;

		private _analyser		: AnalyserNode;

		private _gain			: GainNode;

		private _pannerNode		: StereoPannerNode;

		private _scriptNode		: ScriptProcessorNode;

		private _filters 		: any[];

		private _scriptProcessorListener;

		//
		//
		//
		public constructor()
		{
			super();
			var self = this;
			this._filters 		= [];
			this._gain 			= audioContext.createGain();
			this._analyser		= audioContext.createAnalyser();
			this._spectrumSize	= this._analyser.frequencyBinCount;
			this._waveformSize	= this._analyser.frequencyBinCount;
			this._spectrum		= new Uint8Array(this._spectrumSize);
			this._waveform		= new Uint8Array(this._waveformSize);
			this._pannerNode	= audioContext.createStereoPanner();
			this._scriptNode	= audioContext.createScriptProcessor(4*4096,1,1);
			this._pannerNode.connect(this._scriptNode);
			this._scriptNode.connect(this._analyser);
			this._scriptNode.connect(this._gain);
			this._gain.connect(audioContext.destination);
			var i = 0;

			this._scriptProcessorListener = function(audioProcessingEvent)
			{
				// The input buffer is the song we loaded earlier
				var inputBuffer = audioProcessingEvent.inputBuffer;

				// The output buffer contains the samples that will be modified and played
				var outputBuffer = audioProcessingEvent.outputBuffer;

				// Loop through the output channels (in this case there is only one)
				for (var channel = 0; channel < outputBuffer.numberOfChannels; channel++)
				{
					var inputData = inputBuffer.getChannelData(channel);
					var outputData = outputBuffer.getChannelData(channel);

					// Loop through the 4096 samples
					for (var sample = 0; sample < inputBuffer.length; sample++)
					{
						outputData[sample] = inputData[sample];
					}

					for(var j = 0; j < self._filters.length; ++j)
					{
						var filter = self._filters[j];
						filter.filter(channel,inputData,outputData,inputBuffer.length);
					}
				}
			};
		}

		//
		protected get outputNode():AudioNode
		{
			return this._scriptNode;
		}

		//
		public get fftSize():number
		{
			return this._analyser.fftSize;
		}

		//
		public set fftSize(size:number)
		{
			if(size < 32 || size > 32768)
			{
				throw new Error();
			}
			var isPowOfTwo = (size != 0) && ((size & (size - 1)) == 0);
			if(!isPowOfTwo)
			{
				throw new Error('jecho: Audio.fftSize must be a power of 2');
			}
			this._analyser.fftSize = size;
			this._spectrum		= new Uint8Array(this._analyser.frequencyBinCount);
			this._waveform		= new Uint8Array(this._analyser.frequencyBinCount);
		}

		//
		get volume():number
		{
	        return this._gain.gain.value;
	    }

		//
	    set volume(volume:number)
		{
			this._gain.gain.value = volume;
			this.signals.dispatch(events.VOLUME_CHANGED,volume);
	    }

		//
		get pan():number
		{
			return this._pannerNode.pan.value;
	    }

		//
	    set pan(pan:number)
		{
			this._pannerNode.pan.value = pan;
			this.signals.dispatch(events.PAN_CHANGED,pan);
	    }

		//
		protected onPlay()
		{
			this._scriptNode.addEventListener('audioprocess', this._scriptProcessorListener, false);
		}

		//
		public onPause():void
		{
			this._scriptNode.removeEventListener('audioprocess', this._scriptProcessorListener);
		}

		//
		public get spectrum()
		{
			this._analyser.getByteFrequencyData(this._spectrum);
			return this._spectrum;
		}

		//
		public get waveform()
		{
			this._analyser.getByteTimeDomainData(this._waveform);
			return this._waveform;
		}

		//
		public addFilter(filter):void
		{
			if(this._filters.indexOf(filter) == -1)
			{
				this._filters.push(filter);
			}
		}

		//
		public removeFilter(filter):void
		{
			var index = this._filters.indexOf(filter);
			if(index != -1)
			{
				this._filters.splice(index,1);
			}
		}
	}

	//
	//
	//
	//
	//
	class BufferedAudioDriver extends WebAudioDriver
	{
		private _audio:HTMLAudioElement;

		private _currentTime:number;

		private _audioSource:MediaElementAudioSourceNode;

		//
		//
		//
		public constructor()
		{
			super();
			this._currentTime	= 0;
			this._audio			= new HTMLAudio();
			this._audioSource   = audioContext.createMediaElementSource(this._audio);
			this._audioSource.connect(this.outputNode);
			this._audio.addEventListener('timeupdate', function(e)
			{

			},false);
		}

		//
		public set loop(loop:boolean)
		{
			this._audio.loop = loop;
		}

		//
		public get loop():boolean
		{
			return this._audio.loop;
		}

		//
		get position():number
		{
			return (this._audio.currentTime/this._audio.duration);
		}

		//
		set position(p:number)
		{
			this._audio.currentTime = p*this._audio.duration;
			this.signals.dispatch(events.POSITION_CHANGED,p);
		}

		//
		get pitch():number
		{
			return this._audio.playbackRate;
	    }

		//
	    set pitch(pitch:number)
		{
			this._audio.playbackRate = pitch;
			this.signals.dispatch(events.PITCH_CHANGED,pitch);
	    }

		//
		get duration():number
		{
			return this._audio.duration;
	    }

		//
		get isPlaying():boolean
		{
			return (!this._audio.paused);
		}

		//
		public play():void
		{
			this._audio.currentTime = this._currentTime;
			this._audio.play();
			this.onPlay();
		}

		//
		public pause():void
		{
			this._currentTime = this._audio.currentTime;
			this._audio.pause();
			this.onPause();
		}

		//
		public stop():void
		{
			this._currentTime = 0;
			this._audio.pause();
			this.onPause();
		}

		//
		public load(audio:Audio,src:string):Promise<Audio>
		{
			var self = this;
			return new Promise<Audio>(function(resolve,reject)
			{
				self._audio.addEventListener('canplay',function()
				{
					self.signals.dispatch(events.DURATION_AVAILABLE,self.duration);
					resolve(audio);
				},false);
				self._audio.addEventListener('error',function(e)
				{
					reject(e);
				},false);
				self._audio.src = src;
				self._audio.load();
			});
		}
	}

	//
	//
	//
	//
	//
	class UnbufferedAudioDriver extends WebAudioDriver
	{
		private _buffer			: AudioBuffer;

		private _source			: AudioBufferSourceNode;

		private _pitch			: number;

		private _interval		: number;

		private _isPlaying		: boolean;

		private _position		: number;

		private _timestamp;

		private _loop			: boolean;

		//
		//
		//
		public constructor()
		{
			super();
			this._buffer	= null;
			this._source	= null;
			this._pitch  	= 1;
			this._interval	= null;
			this._isPlaying = false;
			this._position	= 0;
			this._timestamp	= 0.0;
			this._loop		= false;
		}

		//
		private time():number
		{
			return Date.now();
		}

		//
		private getCurrentPosition():number
		{
			var delta		= (this.time() - this._timestamp);
			var duration	= this._buffer.duration*1000; // s => ms
			delta /= this._pitch;
			return (delta / duration);
		}

		//
		public set loop(loop:boolean)
		{
			if(this._source)
			{
				this._source.loop = loop;
			}
			this._loop = loop;
		}

		//
		public get loop():boolean
		{
			if(this._source)
			{
				return this._source.loop;
			}
			return this._loop;
		}

		//
		get position():number
		{
			return this.getCurrentPosition();
		}

		//
		set position(p:number)
		{
			this.pause();
			this._position = p;
			this.play();
		}

		//
		get pitch():number
		{
			return this._pitch;
	    }

		//
	    set pitch(pitch:number)
		{
			var playing = this.isPlaying;
			if(playing)
			{
				this.pause();
			}
			this._pitch = pitch;
			if(this._source)
			{
				this._source.playbackRate.value = pitch;
			}
			if(playing)
			{
				this.play();
			}
			this.signals.dispatch(events.PITCH_CHANGED,pitch);
	    }

		//
		get duration():number
		{
			if(this._buffer)
			{
				return this._buffer.duration;
			}
			return 0;
	    }

		//
		get isPlaying():boolean
		{
			return this._isPlaying;
		}

		//
		public play():void
		{
			var self    = this;

			// Create the audio source
            var source
				= this._source
				= audioContext.createBufferSource()
			;
            source.connect(this.outputNode);

			if(!self._buffer)
			{
				throw new Error("No buffer loaded !");
			}
			source.loop = this._loop;
			source.onended = function()
			{
				self.stop();
			};
            source.buffer = self._buffer;
			source.playbackRate.value = this._pitch;

			//
			this._timestamp = (this.time() - this._position*this._pitch*this._buffer.duration*1000);

			// Real play ...
			var position = this._position*this._buffer.duration;
			source.start(0,position);

			if(self._interval)
            {
                window.clearInterval(self._interval);
            }
            self._interval = window.setInterval(function()
            {
				var p:number = self.getCurrentPosition();
				self.signals.dispatch(events.POSITION_CHANGED,p);
				this._position = p;
            },10);
			this._isPlaying = true;
			this.onPlay();
		}

		//
		public pause():void
		{
			if(this._interval)
            {
                window.clearInterval(this._interval);
            }
			this._isPlaying = false;
			this._source.stop();
			this.onPause();
		}

		//
		public stop():void
		{
			if(this._interval)
            {
                window.clearInterval(this._interval);
            }
			this._position	= 0;
			this._isPlaying = false;
			this._source.stop();
			this.onPause();
		}

		//
		public load(audio:Audio,src:string):Promise<Audio>
		{
			var self = this;
			return new Promise<Audio>((resolve,reject)=>{
	            var request = new XMLHttpRequest();
	            request.open('GET', src, true);
	            request.responseType = 'arraybuffer';
	            request.addEventListener('progress', (e)=>{
	                if(e.lengthComputable)
	                {
	                    var progress = e.loaded / e.total;
	                    self.signals.dispatch(events.LOAD_PROGRESS,progress);
	                }
	            },false);
	            request.addEventListener('load', ()=>{
	                audioContext.decodeAudioData(request.response,
	                function(b)
	                {
	                    self._buffer  = b;
	                    self.signals.dispatch('load');
	                    self.signals.dispatch('canplay');
						self.signals.dispatch(events.DURATION_AVAILABLE,self.duration);
						resolve(audio);
	                },
	                function(e)
	                {
						self.signals.dispatch('loaderror', e);
	                });
	            },false);
	            request.send();
			});
		}
	}

	//
	//
	//
	//
	//
	export class Audio {

		//
		private _driver        	: AudioDriver;

		//
		private _src 			: string;

		//
		private _position 		: number;

		//
		private _pitch 			: number;

		//
		private _volume			: number;

		//
		private _signals		: Signals;

        /**
        *	The base class of all audio types
        *	@class jecho.Audio
		*	@constructor jecho.Audio
		*	@param {String} driver The driver to use for manipulating audio
		*	<ul>
		*		<li>jecho.drivers.BUFFERED <b>[ default ]</b></li>
		*		<li>jecho.drivers.UNBUFFERED</li>
		*	</ul>
		*/
		constructor(driver:string = drivers.BUFFERED)
		{
			this._position 	= 0;
			this._pitch		= 1;
			this._volume 	= 1;
			this._signals	= new Signals(this);
			if(driver === drivers.BUFFERED)
			{
				this._driver = new BufferedAudioDriver();
			}
			else
			{
				//throw new Error("'"+driver+"' driver is not implemented yet");
				this._driver = new UnbufferedAudioDriver();
			}
		}

		/**
		*	@method on
		*	@chainable
		*	@param type		{String}	Event type
		*	@param callback {Function}	The callback function
		*	@return {Audio}
		*/
		public on(type:string,callback:Function):Audio
		{
			this._driver.on(type,callback);
			return this;
		}

		/**
		*	Get / set the looping status
		*	@property loop
		*	@type boolean
		*/
		public set loop(loop:boolean)
		{
			this._driver.loop = loop;
		}
		public get loop():boolean
		{
			return this._driver.loop;
		}

		/**
		*	Get / set the audio playing position from `0` to `1`.
		*	@property position
		*	@type float
		*/
		get position():number
		{
			return this._driver.position;
		}
		set position(p:number)
		{
			this._driver.position = p;
		}

		/**
		*	Get / set the sound pitch within `[0,~]`
		*	@property pitch
		*	@type float
		*/
		get pitch():number
		{
	        return this._driver.pitch;
	    }
	    set pitch(pitch:number)
		{
			if(pitch < 0)
			{
				throw new Error('jecho: Audio.pitch must be >= 0');
			}
			this._driver.pitch = pitch;
	    }

		/**
		*	Get / set the sound panning between `-1` and `+1` where:
		*	<table>
		*		<tr><td style="width:32px">`-1`</td><td>is fully on the left</td></tr>
		*		<tr><td>`0`</td><td>is on the center (default)</td></tr>
		*		<tr><td>`+1`</td><td>is fully on the right</td></tr>
		*	</table>
		*	@property pan
		*	@type float
		*/
		get pan():number
		{
			return this._driver.pan;
	    }
	    set pan(pan:number)
		{
			if(pan < -1 || pan > 1)
			{
				throw new Error("jecho: Audio.pan must be between -1 (left) and 1 (right)");
			}
			this._driver.pan = pan;
	    }

		/**
		*	Get / set the sound volume between 0 and 1.
		*	@property volume
		*	@type float
		*/
		get volume():number
		{
	        return this._driver.volume;
	    }
	    set volume(volume:number)
		{
			if(volume < 0 || volume > 1)
			{
				throw new Error("jecho: Audio.volume must be in [0,1]");
			}
			this._driver.volume = volume;
	    }

		/**
		*	Get / set the size of the fft to use for both the `spectrum` and `waveform`.
		*	@property fftSize
		*	@type Integer
		*/
		public set fftSize(size:number)
		{
			this._driver.fftSize = size;
		}
		public get fftSize():number
		{
			return this._driver.fftSize;
		}

		/**
		*	The audio duration in seconds.
		*	@property duration
		*	@type float
		*	@readOnly
		*/
		get duration():number
		{
			return this._driver.duration;
	    }

		/**
		*	Is the audio currently playing ?
		*	@property isPlaying
		*	@type Boolean
		*	@readOnly
		*/
		get isPlaying():boolean
		{
			return this._driver.isPlaying;
		}

		/**
		*	Load a sound from source filename
		*	@method load
		*	@param src {String}
		*	@return {Promise}
		*	@example
		*		var audio = new jecho.Audio();
		*		audio.load('my/super/music').then(
		*			// on success
		*			function(audio){
		*				audio.pitch = 1.2;
		*				audio.play();
		*			},
		*			// on error
		*			function (error){
		*
		*			}
		*		);
		*/
		public load(src:string = null):Promise<Audio>
		{
			return this._driver.load(this,src);
		}

		/**
		*	Load an audio file.
		*	@static
		*	@method load
		*	@return {Promise}
		*/
		public static load(src:string):Promise<Audio>
		{
			return new jecho.Audio().load(src);
		}

		/**
		*	Play the audio
		*	@method play
		*/
		public play():void
		{
			if(this.isPlaying)
			{
				return;
			}
			this._driver.play();
		}

		/**
		*	Stop the sound and save the position
		*	@method pause
		*/
		public pause():void
		{
			if(this.isPlaying)
			{
				this._driver.pause();
			}
		}

		/**
		*	Stop the sound and reset the position
		*	@method stop
		*/
		public stop():void
		{
			this._driver.stop();
		}

		/**
		*	Get the current sound spectrum
		*	@property spectrum
		*	@type Array
		*/
		public get spectrum()
		{
			return this._driver.spectrum;
		}

		/**
		*	Get the signal waveform
		*	@property waveform
		*	@type Array
		*/
		public get waveform()
		{
			return this._driver.waveform;
		}

		/**
		*	Add a filter to make some effects on the sound
		*	@method addFilter
		*	@param {jecho.AudioFilter} filter The filter to add to the list
		*	@chainable
		*/
		public addFilter(filter):Audio
		{
			this._driver.addFilter(filter);
			return this;
		}

		/**
		*	Remove an audio filter
		*	@method removeFilter
		*	@param {jecho.AudioFilter} filter The filter to be removed
		*	@chainable
		*/
		public removeFilter(filter):Audio
		{
			this._driver.removeFilter(filter);
			return this;
		}
	}
}

//
//
//
if(typeof module !== 'undefined')
{
	if(module.exports)
	{
		module.exports = jecho;
	}
}
