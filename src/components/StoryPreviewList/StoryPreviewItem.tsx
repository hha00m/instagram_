import React, { useEffect, useState } from 'react'
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import { ExtraStory, seenTypes } from '../../reducers/storyReducer'
import FastImage from 'react-native-fast-image'
import { firestore } from 'firebase'
import { navigate } from '../../navigations/rootNavigation'
import { store } from '../../store'
export interface StoryPreviewItemProps {
    item: ExtraStory,
    index: number
}
const StoryPreviewItem = ({ item: { ownUser, storyList }, index }: StoryPreviewItemProps) => {
    const _loadingDeg = new Animated.Value(0)
    const [seen, setSeen] = useState<boolean>(false)
    const myUsername = store.getState().user.user.userInfo?.username || ''
    useEffect(() => {
        const isSeen: boolean = storyList.every(story =>
            (story.seenList || []).indexOf(myUsername) > -1)
        setSeen(isSeen)
    }, [storyList])
    const [preloadingImage, setPreloadingImage] = useState<boolean>(false)
    const _onShowStory = () => {
        if (seen) {
            return _onCompletedLoadingImage()
        }
        const ref = firestore()
        setPreloadingImage(true)
        let preFetchTasks: Promise<any>[] = [];
        storyList.forEach((story) => {
            preFetchTasks.push((async () => {
                const rq = await ref.collection('superimages').doc(`${story.source}`).get()
                const data = rq.data() || {}
                return await Image.prefetch(data.uri || '')
            })());
        });
        const startAt: number = new Date().getTime()
        Promise.all(preFetchTasks).then((results) => {
            let downloadedAll: boolean = true;
            results.forEach((result) => {
                if (!result) {
                    downloadedAll = false;
                }
            })
            if (downloadedAll) {
                const endAt: number = new Date().getTime()
                if (endAt - startAt < 1000) {
                    setTimeout(() => {
                        _onCompletedLoadingImage()
                    }, 1000 - (endAt - startAt));
                } else _onCompletedLoadingImage()
            }
        })
    }
    const _onAnimateDeg = () => {
        Animated.timing(_loadingDeg, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
        }).start(() => {
            if (preloadingImage) {
                _loadingDeg.setValue(0)
                _onAnimateDeg()
            }
        })
    }
    const _onCompletedLoadingImage = () => {
        setPreloadingImage(false)
        navigate('StoryFullView', {
            groupIndex: index
        })
    }
    return (
        <View style={styles.container}>
            <View
                style={styles.itemWrapper}>
                {!seen ? <LinearGradient
                    colors={['#c62f90', '#db3072', '#f19d4c']}
                    start={{ x: 0.75, y: 0.25 }}
                    end={{ x: 0.25, y: 0.75 }}
                    style={{
                        width: '100%',
                        height: '100%'
                    }}
                /> : <View style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#ddd'
                }} />
                }
                {preloadingImage && !seen && <Animated.View
                    onLayout={_onAnimateDeg}
                    style={{
                        ...styles.pointsWrapper,
                        transform: [{
                            rotate: _loadingDeg.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '360deg']
                            })
                        }]
                    }}>
                    <View style={styles.pointWrapper}>
                        <View style={styles.triagle} />
                    </View>
                    <View style={{
                        ...styles.pointWrapper,
                        transform: [{
                            rotate: '30deg'
                        }]
                    }}>
                        <View style={styles.triagle} />
                    </View>
                    <View style={{
                        ...styles.pointWrapper,
                        transform: [{
                            rotate: '60deg'
                        }]
                    }}>
                        <View style={styles.triagle} />
                    </View>
                    <View style={{
                        ...styles.pointWrapper,
                        transform: [{
                            rotate: '90deg'
                        }]
                    }}>
                        <View style={styles.triagle} />
                    </View>

                </Animated.View>
                }
                <View style={styles.imageContainer}>
                    <TouchableOpacity
                        onPress={_onShowStory}
                        activeOpacity={0.8}
                        style={styles.imageWrapper}>
                        <FastImage style={styles.image}
                            source={{ uri: ownUser?.avatarURL }} />
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.username}>
                <Text numberOfLines={1} style={{
                    width: '100%',
                    textAlign: 'center',
                    fontSize: 12,
                    color: seen ? '#666' : '#000'
                }}>{ownUser.username}</Text>
            </View>
        </View>
    )
}

export default React.memo(StoryPreviewItem)

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 7.5,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 20
    },
    itemWrapper: {
        position: 'relative',
        height: 64,
        width: 64,
        overflow: 'hidden',
        borderRadius: 999,
    },
    username: {
        position: 'absolute',
        bottom: 0,
        left: (64 - 74) / 2,
        width: 74,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center'
    },
    imageContainer: {
        borderRadius: 999,
        width: 60,
        height: 60,
        padding: 2,
        backgroundColor: '#fff',
        top: 2,
        left: 2,
        position: 'absolute'
    },
    imageWrapper: {
        backgroundColor: '#fff',
        width: '100%',
        height: '100%',
        borderRadius: 999
    },
    image: {
        borderRadius: 999,
        width: '100%',
        height: '100%',
    },
    pointsWrapper: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        left: 0,
        top: 0,
    },
    pointWrapper: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        left: 0,
        top: 0,
    },
    circlePoint: {
        position: 'absolute',
        height: 2,
        width: 5,
        backgroundColor: '#fff'
    },
    triagle: {
        position: 'absolute',
        transform: [{
            rotate: '-180deg'
        }],
        bottom: 27,
        left: (64 - 20) / 2,
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderTopWidth: 0,
        borderRightWidth: 10,
        borderBottomWidth: 90,
        borderLeftWidth: 10,
        borderTopColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: '#fff',
        borderLeftColor: 'transparent',
    }
})
