	DOUBLE PRECISION FUNCTION R1(X)
	IMPLICIT NONE
	DOUBLE PRECISION X,P(0:3),Q(0:3),NUMER,DENOM
        INTEGER J
	DATA P/2.4266 7955 2305 3175D2,
     .         2.1979 2616 1829 4152D1,
     .         6.9963 8348 8619 1355D0,
     .        -3.5609 8437 0181 5385D-2/
	DATA Q/2.1505 8875 8698 6120D2,
     .         9.1164 9054 0451 4901D1,
     .         1.5082 7976 3040 7787D1,
     .         1.0000 0000 0000 0000D0/
      NUMER = 0
      DENOM = 0
	DO 10 J=0,3
	    NUMER= NUMER  +P(J)*X**(2*J)
          DENOM = DENOM +Q(J)*X**(2*J)
10	CONTINUE
      R1= NUMER/DENOM
	RETURN
	END