/** @jsx React.DOM */
// vim:noet:ai:sw=4:ts=4

var React = require('react');
var request = require('superagent');
var page = require('page');
var uuid = require('uuid');
var Dropzone = require('./react-dropzone.js');

require('./holograms.scss');

React.initializeTouchEvents(true);

var Holodeck = React.createClass({

	getDefaultState: function() {
		return {};
	},

	getInitialState: function() {
		return {
			type: 'foreground',
			source: {
				name: null,
				url: null
			}
		};
	},

	componentDidMount: function() {

		document.body.className = 'holodeck';

		console.log('- H O L O D E C K -');
		console.log('Initializing...');
		console.log('Launching phase manipulators...');
		console.log('Processing 4D buffer data...');
		console.log('Generating holograms...');
		console.log('Holodeck ready!');

		this.setState({
			dropzone: 'hidden',
			giphy: 'hidden',
			danger: null,
			params: {
				active: null,
				type: null,
			}
		}, function(){
			this.fetchStickers();
		});

	},

	fetchStickers: function(){

		var params = this.state.params;

		request
		.post('/magic/holograms/filter/')
		.send(params)
		.end(function(err, res) {
			if(err) {
				console.error(err);
			}
			var payload = JSON.parse(res.text);
			this.setState({data: payload});
		}.bind(this));

	},

	onDrop: function(files) {
		if (files) {
			this.setState({dropzone: 'busy'});
			for (var i=0;i<files.length;i++) {
				(function(file,context){
					var format = file.type;
					if (format.match(/(image)/g) != null) {
						context.setState({dropzone: 'hasimage'});
						var reader = new FileReader();
						var data;
						reader.onloadend = function() {
							var array = context.state.images ? context.state.images : [];
							array.push({
								data: reader.result,
								format: format.replace(/(image\/)/g,'')
							});
							context.setState({
								images: array
							});
						};
						reader.readAsDataURL(file);
					} else {
						context.setState({
							error: 'One or more files is not an image.'
						});
					}
				})(files[i],this);
			}
		}
	},

	cancelUpload: function() {

		this.setState({
			dropzone: 'hidden',
			images: null,
			format: null
		});


	},

	onUpload: function() {

		if (this.state.dropzone == 'hidden' || this.state.dropzone == 'done hidden') {

			this.setState({
				dropzone: 'ready',
				giphy: 'hidden',
				error: ''
			});

		} else if (this.state.dropzone !== 'hidden') {

			if (this.state.images) {

				this.setState({
					dropzone: 'uploading'
				});

				var attribution = null;
				if ((this.state.source.name && this.state.source.name !== '') || (this.state.source.url && this.state.source.url !== '')) {
					attribution = this.state.source;
				}

				var strip_header = new RegExp('^data:image/[^;]+;base64,');

				for (var i=0;i<this.state.images.length;i++) {
					(function(i,context){
						request
						.post('/magic/holograms/upload/')
						.send({
							uploadedImage: context.state.images[i].data.replace(strip_header, ''),
							format: context.state.images[i].format,
							type: context.state.type,
							attribution: attribution
						})
						.end(function(err, res) {
							// TODO: handle error
							var response = JSON.parse(res.text);
							if (response.cool == true) {
								console.log(i)
								document.querySelector('.preview-upload-container').children[i].style.opacity = 0.5;
								if ((i + 1) == context.state.images.length) {
									window.setTimeout(function() {
										context.setState({
											dropzone: 'done hidden',
											images: null,
											source: {
												name: null,
												url: null
											}
										}, function(){
											document.getElementById('upload-source-url').value = '';
											document.getElementById('upload-source-name').value = '';
											//document.getElementById('preview-upload').src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
											context.fetchStickers();
										});
									}, 1000);
								}
							} else {
								context.setState({
									error: "Couldn't upload image(s). :("
								});
							}
						}.bind(this));
					})(i,this);
				}

			}

		}


	},

	addGiphy: function() {

		if (this.state.giphy == 'hidden' || this.state.giphy == 'done hidden') {

			this.setState({
				giphy: 'ready',
				dropzone: 'hidden',
				images: null,
				format: null,
				error: ''
			});

		} else if (this.state.giphy !== 'hidden') {

			if (document.getElementById('giphy-url') !== ''
				& document.getElementById('giphy-url').value.search(/giphy/) != -1) {

				request
				.post('/magic/holograms/giphy/')
				.send({
					url: document.getElementById('giphy-url').value,
					attribution: {
						name: document.getElementById('giphy-source-name').value,
						url: document.getElementById('giphy-source-url').value,
					},
					type: 'foreground'
				})
				.end(function(err, res) {
					// TODO: handle error
					var response = JSON.parse(res.text);
					if(response.cool == true) {
						var context = this;
						window.setTimeout(function() {
							context.setState({
								giphy: 'done hidden',
								source: {
									name: null,
									url: null
								}
							}, function(){
								document.getElementById('giphy-url').value = '';
								document.getElementById('preview-giphy').src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
								context.fetchStickers();
							});
						}, 200);
					} else {
						this.setState({
							error: "Couldn't add Giphy sticker. :("
						});
					}
				}.bind(this));

			}

		}

	},

	cancelGiphy: function() {

		this.setState({
			giphy: 'hidden'
		});

	},

	handleSourceInputs: function(event) {

		event.preventDefault();

		if (event.target.id == 'giphy-source-url' || event.target.id == 'upload-source-url') {
			this.setState({
				source: {
					url: event.target.value,
					name: this.state.source.name
				}
			});
		} else if (event.target.id == 'giphy-source-name' || event.target.id == 'upload-source-name') {
			this.setState({
				source: {
					name: event.target.value,
					url: this.state.source.url
				}
			});
		}

	},

	giphyPreview: function(event){

		document.getElementById('preview-giphy').src = event.target.value;

		var id = event.target.value.match(/\/media\/(.+)\//)[1];
		if (id) {

			request
			.get('https://api.giphy.com/v1/gifs/'+id+'?api_key=dc6zaTOxFJmzC')
			.end(function(err, res) {
				if(res.status == 200) {
					var response = JSON.parse(res.text);
					//console.log(response);
					this.setState({
						source: {
							name: response.data.username,
							url: response.data.source
						}
					});
				} else {
					this.setState({
						error: "Couldn't get source info from Giphy :("
					});
				}
			}.bind(this));

		}

	},

	handleProperties: function(event) {

		var id;
		if (event.target.type === 'checkbox') {
			id = event.target.value;
		} else {
			id = event.target.dataset.id;
		}

		var sticker = document.getElementById(id);
		var active = sticker.getElementsByClassName('active')[0].checked;
		var type = sticker.getElementsByClassName('type')[0].checked ? 'foreground' : 'background';
		var name = sticker.getElementsByClassName('name')[0].value;
		var url = sticker.getElementsByClassName('url')[0].value;

		request
		.put('/magic/holograms/update/')
		.send({
			id: id,
			active: active,
			type: type,
			attribution: {
				name: name,
				url: url
			}
		})
		.end(function(err, res) {
			//console.log(res);
			if(err) {
				console.error(err);
			}
		});

	},

	handleUploadType: function(event) {

		this.setState({
			type:(event.target.checked ? 'foreground' : 'background')
		});

	},

	handleFilters: function(event) {

		var active_value = document['filter-active']['filter-active'].value;
		var type_value = document['filter-type']['filter-type'].value;
		var filter_active = null;
		var filter_type = null;

		if (active_value !== 'both' && active_value !== '') {
			if (active_value === 'active') {
				filter_active = true;
			} else if (active_value === 'inactive') {
				filter_active = false;
			}
		}
		if (type_value !== 'both' && type_value !== '') {
			filter_type = type_value;
		}

		this.setState({
			params: {
				active: filter_active,
				type: filter_type
			}
		}, function() {
			this.fetchStickers();
		});

	},

	handleDanger: function(event) {

		if (event.target.checked) {
			this.setState({danger: 'danger'});
		} else {
			this.setState({danger: null});
		}

	},

	handleDelete: function(event) {

		var id = event.target.getAttribute('data-id');

		if (window.confirm("Are you 100% super duper sure you want to delete that sticker?")) {
			// delete it
			request
			.del('/magic/holograms/' + id + '/')
			.end(function(err, res) {
				if(err) {
					console.error(err);
				} else {
					this.fetchStickers();
				}
			}.bind(this));
		} else {
			// don't
		}

		event.preventDefault();

	},

	onInputClick: function(event) {
		event.preventDefault()
	},

	animate: function(id,event) {
		var img = document.getElementById(id).querySelector('img');
		img.src = img.dataset.gif;
	},

	unanimate: function(id,event) {
		var img = document.getElementById(id).querySelector('img');
		img.src = img.dataset.frame;
	},

	render: function() {

		var records = this.state.data;
		var stickerNodes = [];

		if (records) {
			for(var i=0; i < records.length; i++) {
				var type; // foreground default
				var static_url;
				if (records[i].url.match(/media[0-9]?\.giphy/g) !== null) {
					static_url = records[i].url.replace('giphy.gif','giphy_s.gif')
				} else if (records[i].url.match(/\.gif/g) !== null) {
					static_url = records[i].url.replace(/(https?:\/\/[a-zA-Z0-9]+\.cloudfront\.net)/,'https://glitter-holograms.imgix.net');
					static_url = static_url + '?fm=png&frame=1';
				} else {
					static_url = records[i].url;
				}
				type = (records[i].type === 'foreground') ? true : false;
				stickerNodes.push(<article className={'sticker '+records[i].type} key={uuid.v4()} id={records[i].id} onMouseEnter={this.animate.bind(this,records[i].id)} onMouseLeave={this.unanimate.bind(this,records[i].id)}>
					<img src={static_url} data-gif={records[i].url} data-frame={static_url} key={uuid.v4()} />
					<div className="options">
						<input type="checkbox" defaultChecked={records[i].active} value={records[i].id} id={'active-'+i} className="active" onChange={this.handleProperties} />
						<label htmlFor={'active-'+i}></label>
						<input type="checkbox" defaultChecked={type} id={'type-'+i} value={records[i].id} className="type" onChange={this.handleProperties} />
						<label htmlFor={'type-'+i}></label>
					</div>
					<div className="attribution">
						<input type="text" defaultValue={records[i].attribution.name} id={'name-'+i} className="name" placeholder="name" data-id={records[i].id} onBlur={this.handleProperties} />
						<input type="text" defaultValue={records[i].attribution.url} id={'url-'+i} className="url" placeholder="url" data-id={records[i].id} onBlur={this.handleProperties} />
					</div>
					<a href="#" className="delete" data-id={records[i].id} onClick={this.handleDelete}>Delete this sticker</a>
				</article>);
			}
		}

		var uploadPreviews = [];
		if (this.state.images) {
			for (var i=0;i<this.state.images.length;i++) {
				var divisor = (this.state.images.length == 1) ? 1 : (this.state.images < 7) ? 2 : 3;
				uploadPreviews.push(<img src={this.state.images[i].data} style={{maxHeight:(300 / divisor)+'px'}} className="preview-upload" />)
			}
		}

		return (
			<div className="page root">
				<header>
					<span>holodeck</span>
				</header>
				<section className={'upload '+this.state.dropzone}>
					<Dropzone onDrop={this.onDrop} className={'dropzone '+this.state.dropzone} multiple={true}>
						<div>Drag and drop an image here or click to select one.</div>
						<div className="error">{this.state.error}</div>
						<input type="text" onClick={this.onInputClick} placeholder="artist name" id="upload-source-name" value={this.state.source.name} onChange={this.handleSourceInputs} />
						<input type="text" onClick={this.onInputClick} placeholder="source url" id="upload-source-url" value={this.state.source.url} onChange={this.handleSourceInputs} />
						<input type="checkbox" checked={(this.state.type == 'foreground') ? true : false} id="upload-type" className="type" onChange={this.handleUploadType} />
						<label htmlFor="upload-type"></label>
						<div className="preview-upload-container">
							{uploadPreviews}
						</div>
					</Dropzone>
					<button className="upload" onClick={this.onUpload}>Upload</button>
					<button className="cancel" onClick={this.cancelUpload}>Cancel</button>
				</section>
				<section className={'giphy '+this.state.giphy}>
					<div className={'giphy-zone '+this.state.giphy}>
						<div>Add an image from Giphy.</div>
						<div className="error">{this.state.error}</div>
						<input type="text" placeholder="gif url" id="giphy-url" onChange={this.giphyPreview} />
						<input type="text" placeholder="artist name" id="giphy-source-name" value={this.state.source.name} onChange={this.handleSourceInputs} />
						<input type="text" placeholder="source url" id="giphy-source-url" value={this.state.source.url} onChange={this.handleSourceInputs} />
						<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" id="preview-giphy" />
					</div>
					<button className="add-giphy" onClick={this.addGiphy}>Add from Giphy</button>
					<button className="cancel" onClick={this.cancelGiphy}>Cancel</button>
				</section>
				<section className={'stickers '+this.state.danger}>
					<section className="filters">
						<p>Filter</p>
						<form name="filter-active">
							<input type="radio" name="filter-active" value="active" id="filter-active-only" onChange={this.handleFilters} />
							<label htmlFor="filter-active-only">Active</label>
							<input type="radio" name="filter-active" value="inactive" id="filter-inactive-only" onChange={this.handleFilters} />
							<label htmlFor="filter-inactive-only">Inactive</label>
							<input type="radio" name="filter-active" value="both" defaultChecked id="filter-active-both" onChange={this.handleFilters} />
							<label htmlFor="filter-active-both">Both</label>
						</form>
						<form name="filter-type">
							<input type="radio" name="filter-type" value="foreground" id="filter-foreground-only" onChange={this.handleFilters} />
							<label htmlFor="filter-foreground-only">Foreground</label>
							<input type="radio" name="filter-type" value="background" id="filter-background-only" onChange={this.handleFilters} />
							<label htmlFor="filter-background-only">Background</label>
							<input type="radio" name="filter-type" value="both" defaultChecked id="filter-type-both" onChange={this.handleFilters} />
							<label htmlFor="filter-type-both">Both</label>
						</form>
						<form name="danger-mode" className="danger-mode">
							<input type="checkbox" id="danger-mode" value="danger" onChange={this.handleDanger} />
							<label htmlFor="danger-mode">Danger mode</label>
						</form>
							<span className="clearfix"></span>
					</section>
					{stickerNodes}
					<span className="clearfix"></span>
				</section>
			</div>
		);
	}

});

//module.exports = Holodeck;

React.render(<Holodeck />, document.body);
