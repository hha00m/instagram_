import { firestore } from 'firebase';
import { ThunkAction, ThunkDispatch } from "redux-thunk";
import { ExtraStory, seenTypes, Story, StoryAction, storyActionTypes, StoryErrorAction, StoryList, StorySuccessAction } from '../reducers/storyReducer';
import { HashTag, UserInfo, StoryArchive } from '../reducers/userReducer';
import { store } from "../store";
import { generateUsernameKeywords } from '../utils';
import { AddStoryArchiveRequest } from './userActions';

export const FetchStoryListRequest = ():
    ThunkAction<Promise<void>, {}, {}, StoryAction> => {
    return async (dispatch: ThunkDispatch<{}, {}, StoryAction>) => {
        try {
            const ref = firestore()
            const me = store.getState().user.user
            const myUsername = `${me.userInfo?.username}`
            const request = await ref
                .collection('users')
                .doc(me.userInfo?.username)
                .get()
            const result = request.data()
            if (request.exists) {
                const followingList: string[] = result?.followings || []
                let collection: Story[] = []
                const ownIds: string[] = []
                while (followingList.length > 0) {
                    let result = await ref
                        .collection('stories')
                        .where('userId', 'in', followingList.splice(0, 10))
                        .where('create_at', '>=',
                            new Date(new Date().getTime() - 24 * 3600 * 1000))
                        .orderBy('create_at', 'desc')
                        .get()
                    const temp: Story[] = result.docs.map(doc => {
                        const data: Story = doc.data() || {}
                        const currentSeenList: string[] = data.seenList || []
                        if (currentSeenList.indexOf(`${me.userInfo?.username}`) > -1) {
                            data.seen = 1
                        } else data.seen = 0
                        if (ownIds.indexOf(`${data.userId}`) < 0)
                            ownIds.push(`${data.userId}`)
                        return data
                    })
                    collection = collection.concat(temp)
                }
                let ownInfos: UserInfo[] = []
                while (ownIds.length > 0) {
                    const result = await ref
                        .collection('users')
                        .where('username', 'in', ownIds.splice(0, 10))
                        .get()
                    ownInfos = ownInfos.concat(result.docs.map(doc => doc.data()))
                }
                const fullStory: StoryList = ownInfos.map(info => {
                    const collectStory: Story[] = collection
                        .filter(story => story.userId == info.username)
                    const extraStory: ExtraStory = {
                        ownUser: info,
                        storyList: collectStory
                    }
                    return extraStory
                })
                fullStory.sort((a, b) => (a.storyList.every(
                    x => x.seen === seenTypes.SEEN) ? 1 : 0) - (b.storyList.every(
                        x => x.seen === seenTypes.SEEN) ? 1 : 0))
                fullStory.map(x => {
                    x.storyList.sort((a, b) =>
                        (a.create_at?.toMillis() || 0) - (b.create_at?.toMillis() || 0)
                    )
                })
                const myStoryIndex = fullStory.findIndex(x => x.ownUser.username === myUsername)
                if (myStoryIndex > -1) {
                    const myStory = fullStory.splice(myStoryIndex, 1)[0]
                    fullStory.unshift(myStory)
                }
                dispatch(FetchStoryListSuccess(fullStory))
            } else dispatch(FetchStoryListFailure())
        } catch (e) {
            console.warn(e)
            dispatch(FetchStoryListFailure())
        }
    }
}
export const FetchStoryListFailure = (): StoryErrorAction => {
    return {
        type: storyActionTypes.FETCH_STORY_LIST_FAILURE,
        payload: {
            message: 'Get Story List Failed!'
        }
    }
}
export const FetchStoryListSuccess = (payload: StoryList): StorySuccessAction => {
    return {
        type: storyActionTypes.FETCH_STORY_LIST_SUCCESS,
        payload: payload
    }
}
export const PostStoryRequest = (images: Story[]):
    ThunkAction<Promise<string[]>, {}, {}, StoryAction> => {
    return async (dispatch: ThunkDispatch<{}, {}, StoryAction>) => {
        try {
            const ref = firestore()
            const me = store.getState().user.user
            const shouldSaving = !!store.getState().user.setting?.privacy?.story?.saveToArchive
            const rq = await ref.collection('users')
                .doc(me.userInfo?.username)
                .get()
            if (rq.exists) {
                const storyArchiveCollection: StoryArchive[] = []
                for (let img of images) {
                    const uid = new Date().getTime()
                    await ref.collection('stories').doc(`${uid}`).set({
                        ...img,
                        uid
                    });
                    storyArchiveCollection.push({
                        uid,
                        create_at: new Date().getTime(),
                        superId: img.source as number
                    })
                        ; (img.hashtags || []).map(async hashtag => {
                            const rq = await ref.collection('hashtags')
                                .where('name', '==', hashtag).get()
                            if (rq.size > 0) {
                                const targetHashtag = rq.docs[0]
                                const data: HashTag = targetHashtag.data() || {}
                                const stories = (data.stories || [])
                                stories.push(uid)
                                targetHashtag.ref.update({
                                    stories
                                })
                            } else {
                                const keyword = generateUsernameKeywords(hashtag)
                                keyword.splice(0, 1)
                                const fetchRelatedTags: Promise<string[]>[] = keyword.map(async character => {
                                    const rq = await ref.collection('hashtags').
                                        where('keyword', 'array-contains', character).get()
                                    const data: HashTag[] = rq.docs.map(x => x.data() || {})
                                    return data.map(x => x.name || '')
                                })
                                Promise.all(fetchRelatedTags).then(async rs => {
                                    let relatedTags: string[] = []
                                    rs.map(lv1 => {
                                        lv1.map(x => relatedTags.push(x))
                                    })
                                    relatedTags = Array.from(new Set(relatedTags))
                                    relatedTags.map(async tag => {
                                        const rq = await ref.collection('hashtags').doc(`${tag}`).get()
                                        if (rq.exists) {
                                            const currentRelatedTags = (rq.data() || {}).relatedTags || []
                                            currentRelatedTags.push(hashtag)
                                            rq.ref.update({
                                                relatedTags: currentRelatedTags
                                            })
                                        }
                                    })
                                    const hashtagUid = new Date().getTime()
                                    await ref.collection('hashtags').doc(hashtag).set({
                                        name: hashtag,
                                        followers: [],
                                        keyword,
                                        relatedTags,
                                        sources: [],
                                        stories: [uid],
                                        uid: hashtagUid
                                    })
                                })
                            }
                        })
                }
                if (shouldSaving) {
                    dispatch(AddStoryArchiveRequest(storyArchiveCollection))
                }
                dispatch(FetchStoryListRequest())
            }

        } catch (e) {
            dispatch({
                type: storyActionTypes.FETCH_STORY_LIST_FAILURE,
                payload: {
                    message: 'Upload images error!'
                }
            })
        }
        return []
    }
}
export const DeleteStoryRequest = (storyId: number):
    ThunkAction<Promise<string[]>, {}, {}, StoryAction> => {
    return async (dispatch: ThunkDispatch<{}, {}, StoryAction>) => {
        try {
            const ref = firestore()
            const me = store.getState().user.user
            const myUsername = `${me.userInfo?.username}`
            const rq = await ref.collection('stories')
                .doc(`${storyId}`)
                .get()
            if (rq.exists) {
                const story: Story = rq.data() || {}
                if (story.userId === myUsername) {
                    await rq.ref.delete()
                    // const stories = [...store.getState().storyList]
                    // const index = stories.findIndex(x => x.ownUser.username === myUsername)
                    // const newExtraStory = stories[index]
                    // const newStoryList = [...newExtraStory.storyList]
                    // const storyIndex = newStoryList.findIndex(x => x.uid === storyId)
                    // newStoryList.splice(storyIndex, 1)
                    // newExtraStory.storyList = newStoryList
                    // stories[index] = newExtraStory
                    // dispatch(FetchStoryListSuccess(stories))
                }
            }

        } catch (e) {
            dispatch({
                type: storyActionTypes.FETCH_STORY_LIST_FAILURE,
                payload: {
                    message: 'Delete story error!'
                }
            })
        }
        return []
    }
}