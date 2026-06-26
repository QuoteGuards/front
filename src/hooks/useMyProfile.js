import { useReducer, useEffect, useCallback } from 'react';
import { getMyProfileApi, updateMyProfileApi } from '../api/myProfileApi';

const initialState = {
  profile: null,
  loading: true,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, profile: action.profile };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.error };
    default:
      return state;
  }
}

export function useMyProfile() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const fetchProfile = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const res = await getMyProfileApi();
      dispatch({ type: 'FETCH_SUCCESS', profile: res.data });
    } catch (err) {
      dispatch({ type: 'FETCH_ERROR', error: err?.response?.data?.message ?? '프로필 조회에 실패했습니다.' });
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(async (payload) => {
    const res = await updateMyProfileApi(payload);
    dispatch({ type: 'FETCH_SUCCESS', profile: res.data });
    return res;
  }, []);

  return {
    profile: state.profile,
    loading: state.loading,
    error: state.error,
    refetch: fetchProfile,
    updateProfile,
  };
}
