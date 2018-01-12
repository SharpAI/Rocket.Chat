/* globals popout */
import toastr from 'toastr';

function parseUrl(url) {
	const options = {};
	const parsedUrl = url.match(/(http:|https:|)\/\/(clips.|player.|www.)?(twitch\.tv|vimeo\.com|youtu(be\.com|\.be|be\.googleapis\.com))\/(video\/|embed\/|watch\?v=|v\/|embed\?clip=)?([A-Za-z0-9._%-]*)(\&\S+)?/);
	options.url = url;
	if (parsedUrl != null) {
		if (parsedUrl[3].includes('youtu')) {
			options.url = `https://www.youtube.com/embed/${ parsedUrl[6] }?showinfo=0`;
			options.thumbnail = `https://img.youtube.com/vi/${ parsedUrl[6] }/0.jpg`;
		} else if (parsedUrl[3].includes('vimeo')) {
			options.url = `https://player.vimeo.com/video/${ parsedUrl[6] }`;
		} else if (parsedUrl[3].includes('twitch')) {
			options.url = `http://player.twitch.tv/?channel=${ parsedUrl[6] }`;
		}
		// @TODO add support for other urls
	}
	return options;
}

Template.liveStreamTab.helpers({
	streamingSource() {
		return Template.instance().streamingOptions.get() ? Template.instance().streamingOptions.get().url : '';
	},
	thumbnailUrl() {
		return Template.instance().streamingOptions.get() ? Template.instance().streamingOptions.get().thumbnail : '';
	},
	hasThumbnail() {
		return !!Template.instance().streamingOptions.get() && !!Template.instance().streamingOptions.get().thumbnail && Template.instance().streamingOptions.get().thumbnail !== '';
	},
	hasSource() {
		return !!Template.instance().streamingOptions.get() && !!Template.instance().streamingOptions.get().url && Template.instance().streamingOptions.get().url !== '';
	},
	canEdit() {
		return RocketChat.authz.hasAllPermission('edit-room', this.rid);
	},
	editing() {
		return Template.instance().editing.get() || Template.instance().streamingOptions.get() == null || (Template.instance().streamingOptions.get() != null && (Template.instance().streamingOptions.get().url == null || Template.instance().streamingOptions.get().url === ''));
	},
	canDock() {
		const livestreamTabSource = Template.instance().streamingOptions.get().url;
		let popoutSource = null;
		try {
			if (popout.context) {
				popoutSource = Blaze.getData(popout.context).data && Blaze.getData(popout.context).data.streamingSource;
			}
		} catch (e) {
			return false;
		} finally {
			if (popoutSource != null && livestreamTabSource === popoutSource) {
				return true;
			} else {
				return false;
			}
		}
	},
	isPopoutOpen() {
		return Template.instance().popoutOpen.get();
	}
});

Template.liveStreamTab.onCreated(function() {
	this.editing = new ReactiveVar(false);
	this.streamingOptions = new ReactiveVar();
	this.popoutOpen = new ReactiveVar(popout.context != null);

	this.autorun(() => {
		const room = RocketChat.models.Rooms.findOne(this.data.rid, { fields: { streamingOptions : 1 } });
		this.streamingOptions.set(room.streamingOptions);
	});
});
Template.liveStreamTab.onRendered(function() {
	// console.log('rendered');
	// if (popout.context == null && (!!this.streamingOptions.get().url && this.streamingOptions.get().url !== '')) {
	// 	popout.open({
	// 		content: 'liveStreamView',
	// 		data: {
	// 			'streamingSource': this.streamingOptions.get().url
	// 		}
	// 	});
	// }
});

Template.liveStreamTab.onDestroyed(function() {
	if (popout.docked) {
		popout.close();
	}
});


Template.liveStreamTab.events({
	'click .js-cancel'(e, i) {
		e.preventDefault();
		i.editing.set(false);
	},
	'click .js-save'(e, i) {
		e.preventDefault();

		const streamingOptions = parseUrl(i.find('[name=streamingOptions]').value);

		Meteor.call('saveRoomSettings', this.rid, 'streamingOptions', streamingOptions, function(err) {
			if (err) {
				return handleError(err);
			}
			i.editing.set(false);
			i.streamingOptions.set(streamingOptions);
			return toastr.success(TAPi18n.__('Livestream_source_changed_succesfully'));
		});
	},
	'click .streamingSourceSetting'(e, i) {
		e.preventDefault();
		i.editing.set(true);
	},
	'click .js-dock'(e) {
		e.stopPropagation();
		popout.docked = true;
	},
	'click .js-close'(e) {
		e.stopPropagation();
		popout.close();
		popout.open({
			content: 'liveStreamView',
			data: {
				'streamingSource': Template.instance().streamingOptions.get().url
			}
		});
	},
	'submit [name=streamingOptions]'(e) {
		e.preventDefault();
	},
	'click .js-popout'(e, i) {
		e.preventDefault();
		popout.open({
			content: 'liveStreamView',
			data: {
				'streamingSource': Template.instance().streamingOptions.get().url
			}
		});
		i.popoutOpen.set(true);
	}
});

RocketChat.callbacks.add('roomExit', function() {
	if (popout.context != null && popout.docked) {
		popout.close();
	}
}, RocketChat.callbacks.priority.HIGH, 'close-docked-popout');

RocketChat.callbacks.add('enter-room', function() {
	// console.log('enter-room');
	// const room = RocketChat.models.Rooms.findOne(Session.get('openedRoom'), { fields: { streamingOptions : 1 } });
	// if (popout.docked && (room.streamingOptions && room.streamingOptions.url !== popout.config.data.streamingSource)) {
	// 	if (document.querySelector('.flex-tab-bar .tab-button.active') && document.querySelector('.flex-tab-bar .tab-button.active').title === 'Livestream') {
	// 		popout.open({
	// 			content: 'liveStreamView',
	// 			data: {
	// 				'streamingSource': room.streamingOptions.url
	// 			}
	// 		});
	// 	}
	// }
}, RocketChat.callbacks.priority.HIGH, 'reopen-popout');
