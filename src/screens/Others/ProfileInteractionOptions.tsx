
import { RouteProp } from '@react-navigation/native'
import React, { useEffect, useRef, useState } from 'react'
import { Animated, Image, LayoutChangeEvent, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { PanGestureHandler, PanGestureHandlerGestureEvent, State } from 'react-native-gesture-handler'
import { useDispatch } from 'react-redux'
import { SuperRootStackParamList } from '../../navigations'
import { goBack, navigate } from '../../navigations/rootNavigation'
import { useSelector } from '../../reducers'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { UnfollowRequest, ToggleFollowUserRequest, UpdatePrivacySettingsRequest } from '../../actions/userActions'
import { store } from '../../store'
import { firestore } from 'firebase'
import { ProfileX } from '../../reducers/profileXReducer'
type ProfileInteractionOptionsRouteProp = RouteProp<SuperRootStackParamList, 'ProfileInteractionOptions'>


type ProfileInteractionOptionsProps = {
    route: ProfileInteractionOptionsRouteProp
}
const ProfileInteractionOptions = ({ route }: ProfileInteractionOptionsProps) => {
    const dispatch = useDispatch()
    const { setFollowType, userX, followType } = route.params
    const myUsername = store.getState().user.user.userInfo?.username || ''
    const setting = store.getState().user.setting
    const [closeFriends, setCloseFriends] = useState<string[]>(setting?.privacy?.closeFriends?.closeFriends || [])
    const _bottomSheetOffsetY = React.useMemo(() => new Animated.Value(0), [])
    const ref = useRef<{
        bottomSheetHeight: number
    }>({
        bottomSheetHeight: 0
    })
    useEffect(() => {

    }, [])

    const _onGestureEventHandler = ({ nativeEvent: {
        translationY
    } }: PanGestureHandlerGestureEvent) => {
        if (translationY > 0) {
            _bottomSheetOffsetY.setValue(translationY)
        }
    }
    const _onStateChangeHandler = ({
        nativeEvent: {
            translationY,
            state
        }
    }: PanGestureHandlerGestureEvent) => {
        if (state === State.END) {
            if (translationY > ref.current.bottomSheetHeight * 0.5) {
                Animated.timing(_bottomSheetOffsetY, {
                    toValue: ref.current.bottomSheetHeight,
                    useNativeDriver: true,
                    duration: 150
                }).start(() => goBack())
            } else {
                Animated.spring(_bottomSheetOffsetY, {
                    toValue: 0,
                    useNativeDriver: true,
                }).start()
            }
        }
    }
    const _onUnFollow = () => {
        goBack()
        setFollowType(2)
        dispatch(UnfollowRequest(userX.username || ''))
    }
    const _onUnRequest = () => {
        goBack()
        dispatch(ToggleFollowUserRequest(userX.username || ''))
        setFollowType(2)
    }
    const _toggleCloseFriend = async () => {
        const temp = [...closeFriends]
        const index = temp.indexOf(userX.username || '')
        if (index > -1) {
            temp.splice(index, 1)
        } else {
            temp.push(userX.username || '')
        }
        setCloseFriends(temp)
        const ref = firestore()
        const rq = await ref.collection('users').doc(`${myUsername}`).get()
        if (rq.exists) {
            const data: ProfileX = rq.data() || {}
            const currentCloseFriends = data.privacySetting?.closeFriends?.closeFriends || []
            const index2 = currentCloseFriends.indexOf(userX.username || '')
            if (index2 > -1) {
                currentCloseFriends.splice(index2, 1)
            } else {
                currentCloseFriends.push(userX.username || '')
            }
            dispatch(UpdatePrivacySettingsRequest({
                closeFriends: {
                    closeFriends: currentCloseFriends
                }
            }))
        }
    }
    return (
        <SafeAreaView>
            <TouchableOpacity
                onPress={goBack}
                style={{
                    height: '100%',
                    width: '100%',
                }}>

            </TouchableOpacity>
            <PanGestureHandler
                onGestureEvent={_onGestureEventHandler}
                onHandlerStateChange={_onStateChangeHandler}
            >
                <Animated.View
                    onLayout={({ nativeEvent: { layout: { height } } }: LayoutChangeEvent) => {
                        ref.current.bottomSheetHeight = height
                    }}
                    style={{
                        ...styles.bottomSheet,
                        transform: [{
                            translateY: _bottomSheetOffsetY
                        }]
                    }}>
                    <View style={styles.titleWrapper}>
                        <View style={{
                            marginBottom: 10,
                            height: 3,
                            width: 40,
                            backgroundColor: '#999',
                            borderRadius: 2,
                        }} />
                        <Text style={{
                            fontSize: 16,
                            fontWeight: '600'
                        }}>{userX.username}</Text>
                    </View>
                    {followType === 3 &&
                        <View style={{
                            backgroundColor: '#000'
                        }}>
                            <TouchableOpacity
                                onPress={_onUnRequest}
                                activeOpacity={0.9}
                                style={styles.optionItem}>

                                <Text style={{
                                    color: 'red',
                                    fontSize: 16
                                }}>Cancel Follow Request</Text>
                            </TouchableOpacity>
                        </View>}
                    {followType === 1 && <View style={{
                        backgroundColor: '#000'
                    }}>
                        <TouchableOpacity
                            onPress={_toggleCloseFriend}
                            activeOpacity={0.9}
                            style={styles.optionItem}>
                            <Text style={{
                                fontSize: 16
                            }}>Add to Close Friend List</Text>
                            <Image style={styles.closeFriendIcon}
                                source={closeFriends.indexOf(userX.username || '') > -1
                                    ? require("../../assets/icons/close-friend.png") : require("../../assets/icons/unclose-friend.png")} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                navigate('NotificationOptions', {
                                    user: {
                                        username: userX.username
                                    }
                                })
                            }}
                            activeOpacity={0.9}
                            style={styles.optionItem}>
                            <Text style={{
                                fontSize: 16
                            }}>Notifications</Text>
                            <Icon name="chevron-right" size={24} color="#666" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                navigate('MuteOptions', {
                                    user: {
                                        username: userX.username
                                    }
                                })
                            }}
                            activeOpacity={0.9}
                            style={styles.optionItem}>
                            <Text style={{
                                fontSize: 16
                            }}>Mute</Text>
                            <Icon name="chevron-right" size={24} color="#666" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            style={styles.optionItem}>
                            <Text style={{
                                fontSize: 16
                            }}>Restrict</Text>
                            <Icon name="chevron-right" size={24} color="#666" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={_onUnFollow}
                            activeOpacity={0.9}
                            style={styles.optionItem}>

                            <Text style={{
                                color: 'red',
                                fontSize: 16
                            }}>Unfollow</Text>
                        </TouchableOpacity>
                    </View>}
                </Animated.View>
            </PanGestureHandler>
        </SafeAreaView>
    )
}

export default ProfileInteractionOptions

const styles = StyleSheet.create({
    bottomSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        paddingBottom: 40,
        position: 'absolute',
        zIndex: 1,
        bottom: 0,
        left: 0,
        width: "100%",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 5,
    },
    titleWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: '#ddd'
    },
    optionItem: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        height: 44,
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        alignItems: 'center'
    },
    closeFriendIcon: {
        width: 24,
        height: 24
    }
})
