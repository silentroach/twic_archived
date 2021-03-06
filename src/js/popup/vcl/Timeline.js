/**
 * Timeline visual object
 *
 * Kalashnikov Igor <igor.kalashnikov@gmail.com>
 * Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported
 */

/**
 * @constructor
 */
twic.vcl.Timeline = function(parent) {

    var
        timeline = this,

        /** @type {Element} **/ buttonHolder = twic.dom.expand('div.holder'),
        /** @type {Element} **/ confirmer    = twic.dom.expand('a.confirm');

    confirmer.innerHTML = twic.i18n.translate('confirm_question');
    confirmer.href = '#';

    /**
     * @type {Element}
     * @private
     */
    this.wrapper_ = twic.dom.expand('div.timeline');

    if (!twic.vcl.Timeline.options.avatarSizeDefault) {
        twic.dom.addClass(this.wrapper_, 'timeline32');
    }

    /**
     * @type {boolean}
     * @private
     */
    this.buttonPressed_ = false;

    /**
     * @type {?twic.vcl.Timeline.confirmAction}
     * @private
     */
    this.confirmerAction_ = null;

    /**
     * @type {?number}
     * @private
     */
    this.clickTimer_ = null;

    /**
     * @type {Element}
     * @private
     */
    this.list_ = twic.dom.create('ul');

    /**
     * @type {?number}
     * @private
     */
    this.hoverTimer_ = null;

    /**
     * @type {Element}
     * @private
     */
    this.hoveredTweet_ = null;

    /**
     * @type {Element}
     * @private
     */
    this.tweetButtons_ = twic.dom.expand('div.tweet-buttons');

    /**
     * @type {Element}
     * @private
     */
    this.loader_ = twic.dom.expand('p.loader');

    /**
     * @type {boolean}
     * @private
     */
    this.isLoading_ = false;

    /**
     * @type {DocumentFragment}
     * @private
     */
    this.tweetBuffer_ = null;

    /**
     * @type {twic.vcl.Tweet}
     * @private
     */
    this.replyTweet_ = null;

    /**
     * @type {boolean}
     */
    this.geoEnabled = false;

    /**
     * @type {number}
     * @private
     */
    this.userId_ = 0;

    /**
     * @type {string}
     * @private
     */
    this.userNick_ = '';

    /**
     * @type {Object}
     * @private
     */
    this.firstTweetId_ = {
        'id': '',
        'ts': 0
    };

    /**
     * @type {Object}
     * @private
     */
    this.lastTweetId_ = {
        'id': '',
        'ts': 0
    };

    /**
     * @type {Object.<string, twic.vcl.Tweet>}
     * @private
     */
    this.tweets_ = { };

    /**
     * @type {Element}
     * @private
     */
    this.tbReply_ = twic.dom.expand('img.tb_reply');
    this.tbReply_.title = twic.i18n.translate('title_reply' + (twic.platforms.OSX === twic.platform ? '_osx' : ''));

    /**
     * @type {Element}
     * @private
     */
    this.tbRetweet_ = twic.dom.expand('img.tb_retweet');
    this.tbRetweet_.title = twic.i18n.translate('title_retweet' + (twic.platforms.OSX === twic.platform ? '_osx' : ''));

    /**
     * @type {Element}
     * @private
     */
    this.tbUnRetweet_ = twic.dom.expand('img.tb_retweet_undo');
    this.tbUnRetweet_.title = twic.i18n.translate('title_retweet_undo');

    /**
     * @type {Element}
     * @private
     */
    this.tbDelete_ = twic.dom.expand('img.tb_delete');
    this.tbDelete_.title = twic.i18n.translate('title_delete');

    // @type {Element}
    // @private
    // this.tbConversation_ = twic.dom.expand('img.tb_conversation');
    // this.tbConversation_.title = twic.i18n.translate('title_conversation');

    // init

    this.tbReply_.addEventListener('click', function(e) {
        timeline.doReply_.call(timeline, e);
    }, false);
    buttonHolder.appendChild(this.tbReply_);

    this.tbRetweet_.addEventListener('click', function(e) {
        timeline.doRetweet_.call(timeline, e);
    }, false);
    buttonHolder.appendChild(this.tbRetweet_);

    this.tbUnRetweet_.addEventListener('click', function(e) {
        timeline.doUnRetweet_.call(timeline, e);
    }, false);
    buttonHolder.appendChild(this.tbUnRetweet_);

    this.tbDelete_.addEventListener('click', function(e) {
        timeline.doDelete_.call(timeline, e);
    }, false);
    buttonHolder.appendChild(this.tbDelete_);

    /*
    this.tbConversation_.addEventListener('click', function(e) {
        timeline.doConversation_.call(timeline, e);
    }, false);
    buttonHolder.appendChild(this.tbConversation_);
*/

    this.tweetButtons_.appendChild(buttonHolder);

    confirmer.addEventListener('click', function(e) {
        e.preventDefault();
        timeline.doReallyConfirm_.call(timeline, e);
    }, false);
    this.tweetButtons_.appendChild(confirmer);

    this.wrapper_.appendChild(this.list_);
    this.wrapper_.appendChild(this.tweetButtons_);
    parent.appendChild(this.wrapper_);

    this.resetButtons_();

    timeline.list_.addEventListener('mousedown', function(e) {
        timeline.mouseDown_.call(timeline, e);
    }, false);
    timeline.list_.addEventListener('mouseup',  function(e) {
        timeline.mouseUp_.call(timeline, e);
    }, false);
    timeline.list_.addEventListener('mousemove', function(e) {
        timeline.mouseMove_.call(timeline, e);
    }, false);
    timeline.list_.addEventListener('mouseout',  function(e) {
        timeline.mouseOut_.call(timeline, e);
    }, false);

    window.addEventListener('scroll', function(e) {
        if (timeline.hoveredTweet_) {
            timeline.hideButtons_.call(timeline, e);
        }
    }, false);

    // update times every minute
    setInterval(
        timeline.updateTweetsTime_.bind(timeline),
        1000 * 60
    );
};

/**
 * Confirm actions
 * @enum {number}
 */
twic.vcl.Timeline.confirmAction = {
    ACTION_RETWEET: 0,
    ACTION_UNDO_RETWEET: 1,
    ACTION_DELETE: 2
};

/**
 * Timeline options
 */
twic.vcl.Timeline.options = {
    showTime: false,
    showTimeAsLink: false,
    avatarSizeDefault: true
};

/**
 * Update all the tweets time
 * @private
 */
twic.vcl.Timeline.prototype.updateTweetsTime_ = function() {
    var
        timeline = this,
        id = '';

    for (id in timeline.tweets_) {
        timeline.tweets_[id].updateTime();
    }
};

/**
 * Start the update
 * @param {boolean=} isBottom Show animation at the bottom of timeline?
 * @param {boolean=} noBuffer Don't use buffering
 * @return {boolean}
 */
twic.vcl.Timeline.prototype.beginUpdate = function(isBottom, noBuffer) {
    if (!this.isLoading_) {
        if (isBottom) {
            this.wrapper_.appendChild(this.loader_);
        } else {
            this.wrapper_.insertBefore(this.loader_, this.list_);
        }

        if (!noBuffer) {
            this.tweetBuffer_ = document.createDocumentFragment();
        }

        this.isLoading_ = true;

        return true;
    } else {
        return false;
    }
};

twic.vcl.Timeline.prototype.hoverTweet_ = function(element, tweet) {
    var
        timeline = this,
        hackTop = element.offsetTop - document.body.scrollTop + element.clientHeight + 1;

    timeline.hoveredTweet_ = element;

    timeline.resetButtons_();
    twic.dom.hide(timeline.tweetButtons_);

    if (hackTop > window.innerHeight) {
        return;
    }

    var
        vReply        = twic.dom.toggle(timeline.tbReply_, tweet.getCanReply()),
        vRetweet      = twic.dom.toggle(timeline.tbRetweet_, tweet.getCanRetweet()),
        vUnRetweet    = twic.dom.toggle(timeline.tbUnRetweet_, tweet.getCanUnRetweet()),
        vDelete       = twic.dom.toggle(timeline.tbDelete_, tweet.getCanDelete());
        //vConversation = twic.dom.toggle(timeline.tbConversation_, tweet.getCanConversation());

    if (vReply || vRetweet || vUnRetweet || vDelete) {// || vConversation) {
        twic.dom.show(timeline.tweetButtons_);
        timeline.tweetButtons_.style.top = (hackTop - timeline.tweetButtons_.clientHeight - 1) + 'px';
        timeline.tweetButtons_.style.right = (document.body.clientWidth - element.clientWidth) + 'px';
    }
};

/**
 * Handling the timeline mouseout event
 * @param {MouseEvent} e Event
 * @private
 */
twic.vcl.Timeline.prototype.mouseOut_ = function(e) {
    var
        timeline = this;

    if (timeline.tweetButtons_ !== e.toElement &&
        !twic.dom.isChildOf(e.toElement, timeline.tweetButtons_) &&
        !twic.dom.isChildOf(e.toElement, timeline.list_)
    ) {
        timeline.hideButtons_();
    }
};

/**
 * Handling the timeline mousemove event
 * @param {MouseEvent} e Event
 * @private
 */
twic.vcl.Timeline.prototype.mouseMove_ = function(e) {
    var
        timeline = this,
        find = e.target;

    if (!timeline.buttonPressed_) {
        while (find &&
            'LI' !== find.nodeName &&
            find.parentNode
        ) {
            find = find.parentNode;
        }

        if (find &&
            find !== timeline.hoveredTweet_
        ) {
            var
                tweet = timeline.tweets_[find.id];

            if (tweet) {
                if (tweet.isReplying()) {
                    timeline.hideButtons_();
                } else {
                    if (timeline.hoveredTweet_) {
                        timeline.hoverTweet_(find, tweet);
                    } else {
                        clearTimeout(timeline.hoverTimer_);
                        timeline.hoverTimer_ = setTimeout( function() {
                            timeline.hoverTweet_(find, tweet);
                        }, 150);
                    }
                }
            }
        }
    }
};

/**
 * Handling the timeline mouseup event
 * @param {MouseEvent} e Event
 * @private
 */
twic.vcl.Timeline.prototype.mouseUp_ = function(e) {
    var
        timeline = this;

    if (timeline.clickTimer_) {
        clearTimeout(timeline.clickTimer_);
        timeline.clickTimer_ = null;

        if (!timeline.buttonPressed_ &&
            timeline.hoveredTweet_ &&
            timeline.replyTweet_
        ) {
            timeline.replyTweet_.resetEditor();
            timeline.hideButtons_();
        }
    }

    timeline.buttonPressed_ = false;
};

/**
 * Handling the timeline mousedown event
 * @param {MouseEvent} e Event
 * @private
 */
twic.vcl.Timeline.prototype.mouseDown_ = function(e) {
    var
        timeline = this;

    var timerfunc = function() {
        timeline.hideButtons_();
        timeline.buttonPressed_ = true;
    };

    timeline.clickTimer_ = setTimeout(timerfunc, 250);
};

/**
 * Change button image to loader animation
 * @param {Element} button Button
 * @private
 */
twic.vcl.Timeline.prototype.doButtonLoad_ = function(button) {
    // @resource img/loader.gif
    button.src = 'img/loader.gif';
};

/**
 * Retweet
 * @param {MouseEvent|boolean|null} confirmed Is it confirmed?
 * @private
 */
twic.vcl.Timeline.prototype.doRetweet_ = function(confirmed) {
    var
        timeline = this;

    if (timeline.hoveredTweet_) {
        if (!confirmed || !goog.isBoolean(confirmed)) {
            if (confirmed
                && twic.events.isEventWithModifier(confirmed)
            ) {
                // oldstyle retweet
                var
                    tweet = this.tweets_[timeline.hoveredTweet_.id];

                // wow, so ugly (it is Event here)
                confirmed.stopPropagation();

                timeline.onOldRetweet('RT @' + tweet.getAuthorNick() + ' ' + tweet.getRawText());
                timeline.hideAndRestoreButtons_();
                return;
            }

            timeline.doConfirm_(twic.vcl.Timeline.confirmAction.ACTION_RETWEET);
            return;
        }

        timeline.doButtonLoad_(timeline.tbRetweet_);

        timeline.onRetweet(timeline.userId_, timeline.hoveredTweet_.id, function() {
            timeline.hideAndRestoreButtons_.call(timeline);
        } );
    }
};

/**
 * Really confirm
 */
twic.vcl.Timeline.prototype.doReallyConfirm_ = function() {
    if (this.confirmerAction_ === twic.vcl.Timeline.confirmAction.ACTION_DELETE
        || this.confirmerAction_ === twic.vcl.Timeline.confirmAction.ACTION_UNDO_RETWEET
    ) {
        this.doDelete_(true);
    } else
    if (this.confirmerAction_ === twic.vcl.Timeline.confirmAction.ACTION_RETWEET) {
        this.doRetweet_(true);
    }

    this.resetConfirm_();
};

/**
 * Remove tweet
 * @param {MouseEvent|boolean|null} confirmed Is it confirmed?
 * @private
 */
twic.vcl.Timeline.prototype.doDelete_ = function(confirmed) {
    var
        timeline = this;

    if (this.hoveredTweet_) {
        if (!confirmed
            || !goog.isBoolean(confirmed)
        ) {
            this.doConfirm_(twic.vcl.Timeline.confirmAction.ACTION_DELETE);
            return;
        }

        this.doButtonLoad_(this.tbDelete_);
        this.doButtonLoad_(this.tbUnRetweet_);

        this.onDelete(this.userId_, this.hoveredTweet_.id, function() {
            timeline.hideAndRestoreButtons_.call(timeline);
        } );
    }
};

/**
 * Remove tweet
 * @param {MouseEvent|boolean|null} confirmed Is it confirmed?
 * @private
 */
twic.vcl.Timeline.prototype.doUnRetweet_ = function(confirmed) {
    if (this.hoveredTweet_) {
        if (!confirmed || !goog.isBoolean(confirmed)) {
            this.doConfirm_(twic.vcl.Timeline.confirmAction.ACTION_UNDO_RETWEET);
            return;
        }

        this.doDelete_(true);
    }
};

/**
 * Stop the loading
 */
twic.vcl.Timeline.prototype.endUpdate = function() {
    if (this.isLoading_) {
        if (
            this.tweetBuffer_
            && this.tweetBuffer_.childNodes.length > 0
        ) {
            this.list_.appendChild(this.tweetBuffer_);
            this.tweetBuffer_ = null;
        }

        twic.dom.remove(this.loader_);

        this.isLoading_ = false;
    }
};

/**
 * Hide the timeline tweet buttons
 * @private
 */
twic.vcl.Timeline.prototype.hideButtons_ = function() {
    var
        timeline = this;

    if (timeline.hoveredTweet_) {
        timeline.hoveredTweet_ = null;
    }

    if (timeline.hoverTimer_) {
        clearTimeout(timeline.hoverTimer_);
        timeline.hoverTimer_ = null;
    }

    twic.dom.hide(timeline.tweetButtons_);
};

/**
 * Hide and restore the tweet buttons
 * @private
 */
twic.vcl.Timeline.prototype.hideAndRestoreButtons_ = function() {
    var
        timeline = this;

    timeline.hideButtons_();
    timeline.resetButtons_();
};

/**
 * Reset the confirmer
 * @private
 */
twic.vcl.Timeline.prototype.resetConfirm_ = function() {
    var
        timeline = this;

    timeline.confirmerAction_ = null;
    twic.dom.removeClass(timeline.tweetButtons_, 'bconfirm');
    twic.dom.removeClass(timeline.tweetButtons_, 'bdel');
    twic.dom.removeClass(timeline.tweetButtons_, 'bret');
    twic.dom.removeClass(timeline.tweetButtons_, 'bunret');
};

/**
 * Reset the tweet buttons
 */
twic.vcl.Timeline.prototype.resetButtons_ = function() {
    var
        timeline = this;

    timeline.resetConfirm_();

    // @resource img/buttons/retweet.png
    timeline.tbRetweet_.src      = 'img/buttons/retweet.png';
    // @resource img/buttons/retweet_undo.png
    timeline.tbUnRetweet_.src    = 'img/buttons/retweet_undo.png';
    // @resource img/buttons/delete.png
    timeline.tbDelete_.src       = 'img/buttons/delete.png';
    // @resource img/buttons/reply.png
    timeline.tbReply_.src        = 'img/buttons/reply.png';
    // @resource img/buttons/conversation.png
    //timeline.tbConversation_.src = 'img/buttons/conversation.png';
};

/**
 * Clear the timeline
 */
twic.vcl.Timeline.prototype.clear = function() {
    var
        timeline = this;

    timeline.list_.innerHTML = '';
    timeline.tweets_ = { };

    timeline.lastTweetId_['id'] = '';
    timeline.lastTweetId_['ts'] = 0;
    timeline.firstTweetId_['id'] = '';
    timeline.firstTweetId_['ts'] = 0;
};

/**
 * @param {MouseEvent} e Mouse event
 * @private
 */
twic.vcl.Timeline.prototype.doReply_ = function(e) {
    var
        timeline = this;

    if (null === timeline.confirmerAction_
        && timeline.hoveredTweet_
    ) {
        e.stopPropagation();

        timeline.resetEditor();

        timeline.replyTweet_ = timeline.tweets_[timeline.hoveredTweet_.id];
        timeline.replyTweet_.reply(e && twic.events.isEventWithModifier(e));

        timeline.hideButtons_();
    }
};

/**
 * @param {Event} e Mouse event
 *
twic.vcl.Timeline.prototype.doConversation_ = function(e) {
    window.location = '#conversation#' + this.hoveredTweet_.id;
};*/

/**
 * Open the confirm dialog in the tweetButtons
 * @param {twic.vcl.Timeline.confirmAction} what
 * @private
 */
twic.vcl.Timeline.prototype.doConfirm_ = function(what) {
    var
        timeline = this;

    timeline.confirmerAction_ = what;

    twic.dom.addClass(timeline.tweetButtons_, 'bconfirm');

    if (twic.vcl.Timeline.confirmAction.ACTION_DELETE === what) {
        twic.dom.addClass(timeline.tweetButtons_, 'bdel');
    } else
    if (twic.vcl.Timeline.confirmAction.ACTION_UNDO_RETWEET === what) {
        twic.dom.addClass(timeline.tweetButtons_, 'bunret');
    } else
    if (twic.vcl.Timeline.confirmAction.ACTION_RETWEET === what) {
        twic.dom.addClass(timeline.tweetButtons_, 'bret');
    }
};

/**
 * Add tweet to timeline
 * @param {string} id Tweet identifier
 * @param {number} ts Tweet timestamp
 * @return {!twic.vcl.Tweet}
 */
twic.vcl.Timeline.prototype.addTweet = function(id, ts) {
    var
        timeline = this,
        tweet = new twic.vcl.Tweet(id, timeline);

    if (twic.vcl.Timeline.options.showTime) {
        tweet.setUnixTime(ts, twic.vcl.Timeline.options.showTimeAsLink);
    }

    timeline.tweets_[id] = tweet;

    tweet.onReplySend = function(editor, tweet, replyTo, callback) {
        timeline.onReplySend.call(tweet, editor, tweet, replyTo, callback);
    };

    tweet.onMapShow = function() {
        timeline.hideButtons_.call(timeline);
    };

    tweet.onGalleryShow = function() {
        timeline.hideButtons_.call(timeline);
    };

    if (timeline.isLoading_ &&
        timeline.tweetBuffer_
    ) {
        timeline.tweetBuffer_.appendChild(tweet.getElement());
    } else {
        if (ts > timeline.lastTweetId_['ts']
            && id > timeline.lastTweetId_['id']
        ) {
            timeline.list_.insertBefore(tweet.getElement(), timeline.list_.childNodes[0]);
        } else {
            timeline.list_.appendChild(tweet.getElement());
        }
    }

    if (ts > timeline.lastTweetId_['ts']
        && id > timeline.lastTweetId_['id']
    ) {
        timeline.lastTweetId_['id'] = id;
        timeline.lastTweetId_['ts'] = ts;
    }

    if (0 === timeline.firstTweetId_['ts']
        || (id < timeline.firstTweetId_['id']
            && ts < timeline.firstTweetId_['ts']
        )
    ) {
        timeline.firstTweetId_['id'] = id;
        timeline.firstTweetId_['ts'] = ts;
    }

    return tweet;
};

/**
 * Reset the editor
 */
twic.vcl.Timeline.prototype.resetEditor = function() {
    if (this.replyTweet_) {
        this.replyTweet_.resetEditor();
    }
};

/**
 * Set the timeline user id
 * @param {number} id User identifier
 */
twic.vcl.Timeline.prototype.setUserId = function(id) {
    this.userId_ = id;
};

/**
 * @param {string} nick User nick
 */
twic.vcl.Timeline.prototype.setUserNick = function(nick) {
    this.userNick_ = nick;
};


/**
 * Get the timeline user id
 * @return {number} User identifier
 */
twic.vcl.Timeline.prototype.getUserId = function() {
    return this.userId_;
};

/**
 * @return {string} User nick
 */
twic.vcl.Timeline.prototype.getUserNick = function() {
    return this.userNick_;
};

/**
 * Get the last tweet identifier
 * @return {Object}
 */
twic.vcl.Timeline.prototype.getLastTweetId = function() {
    return this.lastTweetId_;
};

/**
 * Get the first tweet identifier
 * @return {Object}
 */
twic.vcl.Timeline.prototype.getFirstTweetId = function() {
    return this.firstTweetId_;
};

/**
 * Handler for tweet send process
 * @param {twic.vcl.TweetEditor} editor Editor
 * @param {twic.cobj.Tweet} tweet Tweet common object
 * @param {string=} replyTo Reply to tweet
 * @param {function()=} callback Callback
 */
twic.vcl.Timeline.prototype.onReplySend = function(editor, tweet, replyTo, callback) {
    callback();
};

/**
 * Handler for the retweet
 * @param {number} userId User id
 * @param {string} tweetId Tweet id
 * @param {function()=} callback Callback
 */
twic.vcl.Timeline.prototype.onRetweet = function(userId, tweetId, callback) {
    callback();
};

/**
 * Handler for the delete
 * @param {number} userId User id
 * @param {string} tweetId Tweet id
 * @param {function()=} callback Callback
 */
twic.vcl.Timeline.prototype.onDelete = function(userId, tweetId, callback) {
    callback();
};

/**
 * Handler for the oldstyle retweet
 * @param {string} tweetText Tweet text
 */
twic.vcl.Timeline.prototype.onOldRetweet = function(tweetText) { };

/**
 * Get the suggest list
 * @param {string} startPart Start part of the nick
 * @param {function(Array)} callback Callback function
 */
twic.vcl.Timeline.prototype.onReplierGetSuggestList = function(startPart, callback) {
    callback( [ ] );
};
