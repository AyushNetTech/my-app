import React, { useState, useEffect } from 'react'
import { View, TextInput, Alert, StyleSheet, Button, Text, Linking } from 'react-native'
import { supabase } from '../lib/supabase'
import { useNavigation, useRoute } from '@react-navigation/native'

export default function ResetPasswordScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  // universal parser: returns access_token from either query (?access_token=...) or hash (#access_token=...)
  const parseTokenFromUrl = (url: string | null): string | null => {
    if (!url) return null
    try {
      // try query params first
      let token: string | null = new URL(url).searchParams.get('access_token')
      // try hash (fragment) if not found
      if (!token && url.includes('#')) {
        const hash = url.split('#')[1] // everything after '#'
        const hashParams = new URLSearchParams(hash)
        token = hashParams.get('access_token')
      }
      return token
    } catch (err) {
      console.warn('parseTokenFromUrl error', err)
      return null
    }
  }

  useEffect(() => {
    // 1) If App.tsx navigated to this screen with route.params.url, pick that up first
    const paramUrl: string | undefined = route.params?.url
    Alert.alert('Reset screen opened', `route.params.url: ${paramUrl ?? 'none'}`)

    if (paramUrl) {
      const token = parseTokenFromUrl(paramUrl)
      Alert.alert('Parsed token from route param', token ?? 'null')
      if (token) {
        setAccessToken(token)
        setReady(true)
        return
      }
    }

    // 2) If we don't have token from params, check initial URL (cold start)
    Linking.getInitialURL().then(url => {
      Alert.alert('Reset screen getInitialURL', url ?? 'null')
      const token = parseTokenFromUrl(url)
      Alert.alert('Parsed token from initial URL', token ?? 'null')
      if (token) {
        setAccessToken(token)
        setReady(true)
        return
      }
    }).catch(err => {
      Alert.alert('getInitialURL error', String(err))
    })

    // 3) Also listen for event URLs while this screen is mounted (hot link)
    const sub = Linking.addEventListener('url', (evt) => {
      Alert.alert('Reset screen event URL', evt.url)
      const token = parseTokenFromUrl(evt.url)
      Alert.alert('Parsed token from event URL', token ?? 'null')
      if (token) {
        setAccessToken(token)
        setReady(true)
      }
    })

    return () => sub.remove()
  }, [route.params])

  const updatePassword = async () => {
    if (!password) {
      Alert.alert('Error', 'Enter a new password')
      return
    }
    if (!accessToken) {
      Alert.alert('Error', 'No reset token found in URL')
      return
    }

    setLoading(true)

    Alert.alert('Updating password', `Using token: ${accessToken}`)

    // 1. Set the session
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: '',
    })

    if (sessionError) {
      Alert.alert('Set session error', sessionError.message)
      setLoading(false)
      return
    }

    // 2. Update password
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      Alert.alert('Update password error', error.message)
    } else {
      Alert.alert('Success', 'Password updated! Please login with your new password.')
      navigation.navigate('Auth')
    }
  }

  // wait until a real token is present
  if (!ready) {
    return (
      <View style={styles.container}>
        <Text style={styles.waitingText}>Waiting for password reset link...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="New Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button title={loading ? 'Updating...' : 'Update Password'} onPress={updatePassword} disabled={loading} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 12, borderRadius: 6 },
  waitingText: { textAlign: 'center', fontSize: 16, color: '#555' },
})
